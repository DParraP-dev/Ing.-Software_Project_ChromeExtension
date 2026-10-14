const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");

const extensionDir = path.resolve(__dirname, "../../extension");
const sampleProfile = {
    first_name: "Ana", last_name: "García", phone: "+57 300 000 0000",
    country: "Colombia", city: "Bogotá",
    linkedin: "https://linkedin.com/in/ana-example",
    github: "https://github.com/ana-example"
};
let browser;
let server;
let origin;

before(async () => {
    server = http.createServer(async (req, res) => {
        const routes = {
            "/test-form.html": ["test-form.html", "text/html"],
            "/popup/popup.html": ["popup/popup.html", "text/html"],
            "/popup/popup.js": ["popup/popup.js", "text/javascript"]
        };
        const resource = routes[new URL(req.url, "http://localhost").pathname];
        if (!resource) return res.writeHead(404).end();
        try {
            const data = await fs.readFile(path.join(extensionDir, resource[0]));
            res.writeHead(200, { "Content-Type": resource[1] + "; charset=utf-8" }).end(data);
        } catch {
            res.writeHead(500).end();
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({ headless: true, channel: process.env.FILLPRO_BROWSER_CHANNEL || "chrome" });
});

after(async () => {
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
});

// Real popup and content DOM; only Chrome transport/session and HTTP API are simulated.
// Tests never use MySQL, saved passwords, or a user's Chrome profile.
async function fixture(t, options = {}) {
    const context = await browser.newContext({ viewport: { width: 400, height: 600 } });
    t.after(() => context.close());
    const target = await context.newPage();
    await target.addInitScript(() => {
        globalThis.chrome = { runtime: { onMessage: { addListener(listener) {
            globalThis.receiveFillProMessage = listener;
        } } } };
        globalThis.formEvents = [];
        for (const type of ["input", "change", "submit"]) {
            document.addEventListener(type, (event) => globalThis.formEvents.push({ type, id: event.target.id }));
        }
    });
    await target.goto(origin + "/test-form.html");
    if (options.setup) await options.setup(target);
    const manifest = JSON.parse(await fs.readFile(path.join(extensionDir, "manifest.json"), "utf8"));
    for (const script of manifest.content_scripts[0].js) {
        await target.addScriptTag({ path: path.join(extensionDir, script) });
    }
    const state = {
        storage: { token: options.loggedOut ? null : "test-session" },
        activeTab: { id: 41, url: target.url() }, messages: [], requests: [], errors: []
    };
    const popup = await context.newPage();
    popup.on("pageerror", (error) => state.errors.push(error.message));
    await popup.route("http://localhost:3000/**", async (route) => {
        const request = route.request();
        state.requests.push({ method: request.method(), url: request.url() });
        if (options.offline) return route.abort();
        if (request.url().endsWith("/auth/login")) {
            return route.fulfill({ json: { token: "logged-in-session" } });
        }
        return route.fulfill({
            status: options.expired ? 401 : 200,
            json: options.expired ? { error: "Token expirado" }
                : { profile: options.noProfile ? null : { ...sampleProfile, ...options.profile },
                    skills: options.skills || [], accountEmail: options.accountEmail }
        });
    });
    await popup.exposeFunction("testBridge", async (action, data) => {
        if (action === "get") return { ...state.storage };
        if (action === "set") return Object.assign(state.storage, data);
        if (action === "remove") { delete state.storage.token; return; }
        if (action === "tabs") return [state.activeTab];
        if (action === "message") {
            if (options.noReceiver) throw new Error("Could not establish connection. Receiving end does not exist.");
            assert.equal(data.tabId, 41);
            assert.equal(data.options.frameId, 0);
            state.messages.push(data.message);
            return target.evaluate((message) => new Promise((resolve) => {
                globalThis.receiveFillProMessage(message, {}, resolve);
            }), data.message);
        }
        throw new Error("Unexpected action: " + action);
    });
    await popup.addInitScript(() => {
        globalThis.chrome = {
            storage: { local: {
                get: () => testBridge("get"),
                set: (data) => testBridge("set", data),
                remove: () => testBridge("remove")
            } },
            tabs: {
                query: () => testBridge("tabs"),
                sendMessage: (tabId, message, options) => testBridge("message", { tabId, message, options })
            }
        };
    });
    await popup.goto(origin + "/popup/popup.html");
    await popup.waitForFunction(() => !document.getElementById("loginButton").disabled);
    t.after(() => assert.deepEqual(state.errors, []));
    return {
        target, popup, state,
        values: () => target.locator("#jobApplicationForm input").evaluateAll((inputs) => inputs.map((el) => el.value)),
        openPreview: async () => {
            await popup.getByRole("button", { name: "Previsualizar autocompletado" }).click();
            await popup.locator("#previewPanel").waitFor({ state: "visible" });
            await popup.waitForFunction(() => !document.getElementById("previewFields").disabled);
        }
    };
}

test("preview -> edit -> omit -> confirm uses only reviewed values without saving the profile", async (t) => {
    const app = await fixture(t);
    const beforeValues = await app.values();
    await app.openPreview();
    assert.equal(await app.popup.locator(".preview-field").count(), 7);
    assert.deepEqual(await app.values(), beforeValues);
    assert.deepEqual(await app.target.evaluate(() => formEvents), []);
    await app.popup.getByLabel("Nombre", { exact: true }).fill("Ana María");
    await app.popup.getByLabel("Ciudad actual", { exact: true }).fill("Medellín");
    await app.popup.getByLabel("Perfil de LinkedIn", { exact: true }).fill("");
    await app.popup.getByRole("checkbox", { name: "Incluir GitHub o portafolio de código", exact: true }).uncheck();
    assert.match(await app.popup.locator("#previewSummary").textContent(), /5 campos/);
    const cancelBounds = await app.popup.locator("#cancelPreviewButton").boundingBox();
    assert.ok(cancelBounds.y + cancelBounds.height <= 600, "Confirmation/cancel must fit inside Chrome's popup");
    if (process.env.FILLPRO_SCREENSHOT_DIR) {
        await app.popup.locator("#previewFields").evaluate((el) => { el.scrollTop = 0; });
        await fs.mkdir(process.env.FILLPRO_SCREENSHOT_DIR, { recursive: true });
        await app.popup.screenshot({ path: path.join(process.env.FILLPRO_SCREENSHOT_DIR, "fillpro-preview.png"), fullPage: true });
    }
    await app.popup.getByRole("button", { name: "Confirmar y autocompletar" }).click();
    await app.popup.waitForFunction(() => document.getElementById("status").dataset.type === "success");
    assert.deepEqual(await app.values(), ["Ana María", "García", "+57 300 000 0000", "Colombia", "Medellín", "", ""]);
    assert.equal(app.state.messages.filter((message) => message.type === "FILLPRO_APPLY_PREVIEW").length, 1);
    assert.equal(app.state.requests.length, 1);
    assert.equal(app.state.requests[0].method, "GET");
    assert.equal(await app.target.evaluate(() => formEvents.filter((event) => event.type === "submit").length), 0);
    assert.equal(await app.target.evaluate(() => formEvents.filter((event) => event.type === "input").length), 5);
});

test("cancel and reopening the popup discard corrections and never fill", async (t) => {
    const app = await fixture(t);
    await app.openPreview();
    await app.popup.getByLabel("Nombre", { exact: true }).fill("Correction to discard");
    await app.popup.getByRole("button", { name: "Cancelar", exact: true }).click();
    assert.deepEqual(await app.values(), Array(7).fill(""));
    assert.equal(app.state.messages.some((m) => m.type === "FILLPRO_APPLY_PREVIEW"), false);
    await app.openPreview();
    assert.equal(await app.popup.getByLabel("Nombre", { exact: true }).inputValue(), "Ana");
    await app.popup.reload();
    await app.popup.locator("#autofillPanel").waitFor({ state: "visible" });
    assert.equal(await app.popup.locator("#previewPanel").isVisible(), false);
    assert.deepEqual(await app.values(), Array(7).fill(""));
});

test("confirm is disabled when all fields are omitted or empty", async (t) => {
    const app = await fixture(t);
    await app.openPreview();
    for (const checkbox of await app.popup.getByRole("checkbox").all()) await checkbox.uncheck();
    assert.equal(await app.popup.locator("#confirmButton").isDisabled(), true);
    const first = app.popup.getByRole("checkbox", { name: "Incluir Nombre", exact: true });
    await first.check();
    await app.popup.getByLabel("Nombre", { exact: true }).fill("   ");
    assert.equal(await app.popup.locator("#confirmButton").isDisabled(), true);
    assert.deepEqual(await app.values(), Array(7).fill(""));
});

test("stale page values reject confirmation before any write", async (t) => {
    const app = await fixture(t);
    await app.openPreview();
    await app.target.locator("#location-city").fill("User's own correction");
    await app.popup.getByRole("button", { name: "Confirmar y autocompletar" }).click();
    await app.popup.waitForFunction(() => document.getElementById("status").dataset.type === "error");
    assert.match(await app.popup.locator("#status").textContent(), /formulario cambió/);
    assert.deepEqual(await app.values(), ["", "", "", "", "User's own correction", "", ""]);
    assert.equal(await app.popup.locator("#previewPanel").isVisible(), false);
});

test("switching tabs cannot apply a preview to another page", async (t) => {
    const app = await fixture(t);
    await app.openPreview();
    app.state.activeTab = { id: 99, url: "https://example.test/elsewhere" };
    await app.popup.getByRole("button", { name: "Confirmar y autocompletar" }).click();
    await app.popup.waitForFunction(() => document.getElementById("status").dataset.type === "error");
    assert.match(await app.popup.locator("#status").textContent(), /pestaña cambió/);
    assert.equal(app.state.messages.some((m) => m.type === "FILLPRO_APPLY_PREVIEW"), false);
    assert.deepEqual(await app.values(), Array(7).fill(""));
});

test("select preview uses option values and ignores hidden/read-only controls in real DOM", async (t) => {
    const app = await fixture(t, { setup: async (page) => {
        await page.evaluate(() => {
            document.getElementById("applicant-country").outerHTML =
                '<select id="applicant-country" name="country"><option value="">Elige un país</option>'
                + '<option value="CO">Colombia</option><option value="MX">México</option>'
                + '<option value="XX" disabled>No disponible</option></select>';
            document.getElementById("contact-number").readOnly = true;
            document.getElementById("code-portfolio").parentElement.style.display = "none";
        });
    } });
    await app.openPreview();
    assert.equal(await app.popup.locator(".preview-field").count(), 5);
    const country = app.popup.getByLabel("País de residencia", { exact: true });
    assert.equal(await country.inputValue(), "1");
    await country.selectOption("2");
    await app.popup.getByRole("button", { name: "Confirmar y autocompletar" }).click();
    await app.popup.waitForFunction(() => document.getElementById("status").dataset.type === "success");
    assert.equal(await app.target.locator("#applicant-country").inputValue(), "MX");
    assert.equal(await app.target.locator("#contact-number").inputValue(), "");
    assert.equal(await app.target.locator("#code-portfolio").inputValue(), "");
});

for (const scenario of [
    { title: "missing profile", options: { noProfile: true }, text: /Completa y guarda tu perfil/ },
    { title: "expired session", options: { expired: true }, text: /sesión expiró/ },
    { title: "offline API", options: { offline: true }, text: /backend esté activo/ },
    { title: "missing content receiver", options: { noReceiver: true }, text: /Recarga la extensión/ }
]) {
    test(scenario.title + " leaves the page untouched with an actionable error", async (t) => {
        const app = await fixture(t, scenario.options);
        await app.popup.getByRole("button", { name: "Previsualizar autocompletado" }).click();
        await app.popup.waitForFunction(() => document.getElementById("status").dataset.type === "error");
        assert.match(await app.popup.locator("#status").textContent(), scenario.text);
        assert.deepEqual(await app.values(), Array(7).fill(""));
        assert.equal(await app.popup.locator("#previewPanel").isVisible(), false);
        if (scenario.options.expired) {
            assert.equal(await app.popup.locator("#loginPanel").isVisible(), true);
            assert.equal(app.state.storage.token, undefined);
        }
    });
}

test("existing values are unchecked by default and can be explicitly reviewed for replacement", async (t) => {
    const app = await fixture(t, { setup: async (page) => {
        await page.locator("#candidate-given-name").fill("Mi nombre anterior");
    } });
    await app.openPreview();
    const include = app.popup.getByRole("checkbox", { name: "Incluir Nombre", exact: true });
    assert.equal(await include.isChecked(), false);
    assert.equal(await app.popup.getByLabel("Nombre", { exact: true }).isDisabled(), true);
    await include.check();
    await app.popup.getByLabel("Nombre", { exact: true }).fill("Nombre revisado");
    await app.popup.getByRole("button", { name: "Confirmar y autocompletar" }).click();
    await app.popup.waitForFunction(() => document.getElementById("status").dataset.type === "success");
    assert.equal(await app.target.locator("#candidate-given-name").inputValue(), "Nombre revisado");
});

test("preview keeps the modular engine's account email, skills, dates and numeric fields", async (t) => {
    const app = await fixture(t, {
        profile: { birth_date: "1995-05-10", years_experience: 4 },
        skills: ["JavaScript", "SQL"], accountEmail: "cuenta@example.test",
        setup: async (page) => page.evaluate(() => {
            document.getElementById("jobApplicationForm").insertAdjacentHTML("beforeend",
                '<label>Correo electrónico<input id="extra-email" type="email" name="email"></label>'
                + '<label>Fecha de nacimiento<input id="extra-date" type="date" name="birth_date"></label>'
                + '<label>Años de experiencia<input id="extra-years" type="number" name="years_experience"></label>'
                + '<label>Habilidades<textarea id="extra-skills" name="skills"></textarea></label>');
        })
    });
    await app.openPreview();
    assert.equal(await app.popup.getByLabel("Correo electrónico", { exact: true }).inputValue(), "cuenta@example.test");
    assert.equal(await app.popup.getByLabel("Fecha de nacimiento", { exact: true }).inputValue(), "1995-05-10");
    assert.equal(await app.popup.getByLabel("Años de experiencia", { exact: true }).inputValue(), "4");
    assert.equal(await app.popup.getByLabel("Habilidades", { exact: true }).inputValue(), "JavaScript, SQL");
    await app.popup.getByRole("button", { name: "Confirmar y autocompletar" }).click();
    await app.popup.waitForFunction(() => document.getElementById("status").dataset.type === "success");
    assert.equal(await app.target.locator("#extra-email").inputValue(), "cuenta@example.test");
    assert.equal(await app.target.locator("#extra-date").inputValue(), "1995-05-10");
    assert.equal(await app.target.locator("#extra-years").inputValue(), "4");
    assert.equal(await app.target.locator("#extra-skills").inputValue(), "JavaScript, SQL");
    assert.equal(app.state.requests.length, 1);
});

test("visible controls inside display:contents containers remain eligible", async (t) => {
    const app = await fixture(t, { setup: async (page) => page.evaluate(() => {
        document.getElementById("candidate-given-name").parentElement.style.display = "contents";
    }) });
    await app.openPreview();
    assert.equal(await app.popup.getByLabel("Nombre", { exact: true }).inputValue(), "Ana");
    await app.popup.getByRole("button", { name: "Confirmar y autocompletar" }).click();
    await app.popup.waitForFunction(() => document.getElementById("status").dataset.type === "success");
    assert.equal(await app.target.locator("#candidate-given-name").inputValue(), "Ana");
});

test("login/logout still work and login does not write any fields", async (t) => {
    const app = await fixture(t, { loggedOut: true });
    await app.popup.getByLabel("Correo", { exact: true }).fill("demo@example.test");
    await app.popup.getByLabel("Contraseña", { exact: true }).fill("test-password");
    await app.popup.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await app.popup.locator("#autofillPanel").waitFor({ state: "visible" });
    assert.equal(app.state.storage.token, "logged-in-session");
    assert.equal(app.state.messages.length, 0);
    await app.popup.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await app.popup.locator("#loginPanel").waitFor({ state: "visible" });
    assert.equal(app.state.storage.token, undefined);
    assert.deepEqual(await app.values(), Array(7).fill(""));
});
