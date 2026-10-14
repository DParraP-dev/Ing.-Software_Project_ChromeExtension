// HU-RF-013: prueba de la página "Historial" de la aplicación web.
//
// Levanta el backend real en el puerto 3000 (el que usa la web), sirve la
// carpeta frontend/ por http y recorre la página con Chromium: inicio de
// sesión, acceso desde la página principal, lista y botón "Borrar historial".
//
// Uso (desde la carpeta backend/, con MySQL encendido y el backend detenido):
//   node --test ../tests/historial/frontend.test.js
//
// Para correr todas las del historial juntas (una a la vez, porque dos de
// ellas usan el puerto 3000):
//   node --test --test-concurrency=1 ../tests/historial/*.test.js

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { cleanupTestUsers } = require("./limpieza");

const ROOT = path.join(__dirname, "..", "..");
const FRONTEND_PATH = path.join(ROOT, "frontend");
const API_URL = "http://localhost:3000";

const TEST_EMAILS = "prueba-web-%@fillpro.test";

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

const CONTENT_TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png" };

function startFrontendServer() {
    const server = http.createServer((req, res) => {
        const filePath = path.join(FRONTEND_PATH, decodeURIComponent(new URL(req.url, "http://x").pathname));
        if (!filePath.startsWith(FRONTEND_PATH) || !fs.existsSync(filePath)) {
            res.statusCode = 404;
            return res.end();
        }
        res.setHeader("Content-Type", CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream");
        res.end(fs.readFileSync(filePath));
    });

    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve(server));
    });
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

describe("Página de historial de la aplicación web", { skip: getSkipReason() }, () => {
    let app;
    let db;
    let apiServer;
    let frontendServer;
    let frontendUrl;
    let browser;

    async function createUser(label) {
        const user = {
            email: `prueba-web-${label}-${Date.now()}@fillpro.test`,
            password: "clave-de-prueba-123"
        };
        user.id = (await api("POST", "/auth/register", { body: user })).userId;
        user.token = (await api("POST", "/auth/login", { body: user })).token;
        return user;
    }

    // Inicia sesión desde login.html, igual que un usuario real
    async function loginAndOpenHistory(user) {
        const page = await browser.newPage();
        await page.goto(`${frontendUrl}/pages/login.html`);
        await page.fill("#email", user.email);
        await page.fill("#password", user.password);
        await page.click("button[type='submit']");
        await page.waitForURL("**/pages/main.html");

        await page.click("#historyButton");
        await page.waitForURL("**/pages/history.html");
        await page.waitForFunction(() => document.getElementById("historyStatus").textContent.trim() !== "Cargando historial...");
        return page;
    }

    function readList(page) {
        return page.$$eval(".history-item", (items) => items.map((item) => ({
            website: item.querySelector(".history-item__website").textContent,
            date: item.querySelector(".history-item__date").textContent,
            fields: [...item.querySelectorAll(".history-item__fields li")].map((li) => li.textContent)
        })));
    }

    before(async () => {
        app = require(path.join(ROOT, "backend", "src", "app"));
        db = require(path.join(ROOT, "backend", "src", "config", "database"));
        await cleanupTestUsers(db, TEST_EMAILS);

        await new Promise((resolve, reject) => {
            apiServer = app.listen(3000, "localhost", resolve);
            apiServer.on("error", () => reject(new Error(
                "El puerto 3000 está ocupado. Detén el backend antes de correr esta prueba."
            )));
        });

        frontendServer = await startFrontendServer();
        frontendUrl = `http://127.0.0.1:${frontendServer.address().port}`;

        browser = await chromium.launch({
            channel: process.env.NAVEGADOR || "chromium",
            headless: process.env.VISIBLE !== "1"
        });
    });

    after(async () => {
        await browser?.close();
        if (db) {
            await cleanupTestUsers(db, TEST_EMAILS);
            await db.end();
        }
        apiServer?.close();
        frontendServer?.close();
    });

    it("muestra el historial del más reciente al más antiguo con fecha, dominio y campos", async () => {
        const user = await createUser("lista");
        await api("POST", "/logs", { token: user.token, body: { website: "www.computrabajo.com.co", fieldsCompleted: ["firstName"] } });
        await api("POST", "/logs", { token: user.token, body: { website: "https://www.linkedin.com/jobs/1", fieldsCompleted: ["firstName", "phone", "github"] } });

        const page = await loginAndOpenHistory(user);
        const list = await readList(page);

        assert.deepEqual(list.map((log) => log.website), ["www.linkedin.com", "www.computrabajo.com.co"]);
        assert.deepEqual(list[0].fields, ["Nombre", "Teléfono", "GitHub"]);
        assert.ok(list[0].date.includes(String(new Date().getFullYear())), `fecha inesperada: ${list[0].date}`);
        assert.equal(await page.textContent("#historyCount"), "2 autocompletados");

        if (process.env.CAPTURA) {
            await page.screenshot({ path: process.env.CAPTURA, fullPage: true });
        }
        await page.close();
    });

    it("muestra un mensaje cuando el historial está vacío", async () => {
        const user = await createUser("vacio");

        const page = await loginAndOpenHistory(user);

        assert.equal(await page.textContent("#historyStatus"), "Todavía no has autocompletado formularios con FillPro.");
        assert.equal(await page.isDisabled("#clearHistoryButton"), true);
        await page.close();
    });

    it("el botón Borrar historial elimina los registros solo si el usuario confirma", async () => {
        const user = await createUser("borrar");
        await api("POST", "/logs", { token: user.token, body: { website: "ejemplo.com", fieldsCompleted: [] } });

        const page = await loginAndOpenHistory(user);

        // Si cancela la confirmación, no se borra nada
        page.once("dialog", (dialog) => dialog.dismiss());
        await page.click("#clearHistoryButton");
        assert.equal((await readList(page)).length, 1);
        assert.equal((await api("GET", "/logs", { token: user.token })).length, 1);

        // Si confirma, se borra todo
        page.once("dialog", (dialog) => dialog.accept());
        await page.click("#clearHistoryButton");
        await page.waitForFunction(() => document.getElementById("historyStatus").textContent === "Historial borrado correctamente.");

        assert.equal((await readList(page)).length, 0);
        assert.equal(await page.isDisabled("#clearHistoryButton"), true);
        assert.deepEqual(await api("GET", "/logs", { token: user.token }), []);
        await page.close();
    });

    it("muestra el sitio web como texto aunque traiga código HTML", async () => {
        const user = await createUser("seguridad");
        const malicious = "<img src=x onerror=\"document.title='hackeado'\">";
        await api("POST", "/logs", { token: user.token, body: { website: malicious, fieldsCompleted: [] } });

        const page = await loginAndOpenHistory(user);

        assert.equal(await page.$(".history-item img"), null);
        assert.equal(await page.textContent(".history-item__website"), malicious);
        assert.notEqual(await page.title(), "hackeado");
        await page.close();
    });

    it("sin sesión iniciada, envía al usuario al inicio de sesión", async () => {
        const page = await browser.newPage();
        await page.goto(`${frontendUrl}/pages/history.html`);
        await page.waitForURL("**/pages/login.html");
        await page.close();
    });
});
