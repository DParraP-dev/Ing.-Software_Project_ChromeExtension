// HU-RF-013: prueba de punta a punta del registro del historial desde la extensión.
//
// Levanta el backend real en el puerto 3000 (el que usa el popup), carga la
// extensión en Chromium, inicia sesión desde el popup, autocompleta
// extension/test-form.html y revisa que el registro quede en la base de datos.
//
// Uso (desde la carpeta backend/, con MySQL encendido y el backend detenido):
//   node --test ../tests/historial/extension.test.js
//
// Para correr todas las del historial juntas (una a la vez, porque dos de
// ellas usan el puerto 3000):
//   node --test --test-concurrency=1 ../tests/historial/*.test.js

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { cleanupTestUsers } = require("./limpieza");

const ROOT = path.join(__dirname, "..", "..");

const TEST_EMAILS = "prueba-extension-%@fillpro.test";

let chromium = null;
try {
    ({ chromium } = require("playwright"));
} catch {
    // Playwright no está instalado en tests/historial
}

// Sin base de datos o sin Playwright (por ejemplo, al correr `npm test` desde
// la raíz) la prueba se omite en lugar de fallar
function getSkipReason() {
    if (!process.env.DB_NAME && !fs.existsSync(path.join(process.cwd(), ".env"))) {
        return "requiere MySQL y backend/.env: ejecutar desde la carpeta backend/";
    }
    if (!chromium) {
        return "requiere Playwright: ejecutar npm install en tests/historial";
    }
    return false;
}

const EXTENSION_PATH = fs.realpathSync(path.join(ROOT, "extension"));
const API_URL = "http://localhost:3000";
// El formulario se sirve en el mismo host que la API porque es el único al
// que la extensión tiene permiso fijo; en uso real, el permiso activeTab le
// da acceso a la pestaña donde el usuario abrió el popup.
const FORM_URL = `${API_URL}/formulario-prueba.html`;

const EXPECTED_FIELDS = ["firstName", "lastName", "phone", "country", "city", "linkedin", "github"];

// Chromium calcula el ID de una extensión desempaquetada a partir de su ruta
function getUnpackedExtensionId(extensionPath) {
    let pathBytes = Buffer.from(extensionPath, "utf8");

    if (process.platform === "win32") {
        const normalizedPath = extensionPath.replace(/^[a-z]:/, (drive) => drive.toUpperCase());
        pathBytes = Buffer.from(normalizedPath, "utf16le");
    }

    return crypto.createHash("sha256")
        .update(pathBytes)
        .digest("hex")
        .slice(0, 32)
        .split("")
        .map((char) => String.fromCharCode(97 + parseInt(char, 16)))
        .join("");
}

async function api(method, route, { token, body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${route}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    return response.json();
}

describe("Registro del historial desde la extensión", { skip: getSkipReason() }, () => {
    let app;
    let db;
    let server;
    let context;
    let popupUrl;
    const user = {
        email: `prueba-extension-${Date.now()}@fillpro.test`,
        password: "clave-de-prueba-123"
    };

    async function openPopupLoggedIn() {
        const popup = await context.newPage();
        await popup.goto(popupUrl);

        if (await popup.isVisible("#loginPanel")) {
            await popup.fill("#email", user.email);
            await popup.fill("#password", user.password);
            await popup.click("#loginButton");
            await popup.waitForSelector("#autofillPanel:not(.hidden)");
        }

        return popup;
    }

    // Igual que el popup real: el formulario debe ser la pestaña activa
    async function autofillFrom(popup, formPage) {
        await formPage.bringToFront();
        await popup.evaluate(() => document.getElementById("autofillButton").click());
        await popup.waitForFunction(
            () => !document.getElementById("autofillButton").disabled
                && document.getElementById("status").textContent !== "Buscando campos compatibles...",
            null,
            { polling: 100 }
        );
        return popup.textContent("#status");
    }

    before(async () => {
        app = require(path.join(ROOT, "backend", "src", "app"));
        db = require(path.join(ROOT, "backend", "src", "config", "database"));
        await cleanupTestUsers(db, TEST_EMAILS);

        await new Promise((resolve, reject) => {
            server = app.listen(3000, "localhost", resolve);
            server.on("error", () => reject(new Error(
                "El puerto 3000 está ocupado. Detén el backend antes de correr esta prueba."
            )));
        });

        const registered = await api("POST", "/auth/register", { body: user });
        user.id = registered.userId;
        user.token = (await api("POST", "/auth/login", { body: user })).token;
        await api("POST", "/profile", {
            token: user.token,
            body: {
                firstName: "Ana",
                lastName: "Gómez",
                phone: "3001234567",
                country: "Colombia",
                city: "Medellín",
                linkedin: "https://linkedin.com/in/ana-gomez",
                github: "https://github.com/ana-gomez",
                skills: []
            }
        });

        popupUrl = `chrome-extension://${getUnpackedExtensionId(EXTENSION_PATH)}/popup/popup.html`;
        context = await chromium.launchPersistentContext("", {
            channel: process.env.NAVEGADOR || "chromium",
            headless: process.env.VISIBLE !== "1",
            args: [
                `--disable-extensions-except=${EXTENSION_PATH}`,
                `--load-extension=${EXTENSION_PATH}`
            ]
        });

        const formHtml = fs.readFileSync(path.join(EXTENSION_PATH, "test-form.html"));
        await context.route(FORM_URL, (route) => route.fulfill({ contentType: "text/html", body: formHtml }));
    });

    after(async () => {
        await context?.close();
        if (db) {
            await cleanupTestUsers(db, TEST_EMAILS);
            await db.end();
        }
        server?.close();
    });

    it("registra el dominio y los campos después de autocompletar", async () => {
        const formPage = await context.newPage();
        await formPage.goto(FORM_URL);
        const popup = await openPopupLoggedIn();

        const status = await autofillFrom(popup, formPage);
        assert.match(status, /^Se completaron 7 campos/);

        const logs = await api("GET", "/logs", { token: user.token });
        assert.equal(logs.length, 1);
        assert.equal(logs[0].website, "localhost");
        assert.deepEqual(logs[0].fieldsCompleted, EXPECTED_FIELDS);

        await popup.close();
        await formPage.close();
    });

    it("si el historial no responde, el autocompletado funciona igual", async () => {
        await api("DELETE", "/logs", { token: user.token });
        await context.route(`${API_URL}/logs`, (route) => route.abort());

        const formPage = await context.newPage();
        await formPage.goto(FORM_URL);
        const popup = await openPopupLoggedIn();

        const status = await autofillFrom(popup, formPage);
        await context.unroute(`${API_URL}/logs`);

        assert.match(status, /^Se completaron 7 campos/);
        assert.equal(await formPage.inputValue("#candidate-given-name"), "Ana");
        assert.deepEqual(await api("GET", "/logs", { token: user.token }), []);

        await popup.close();
        await formPage.close();
    });
});
