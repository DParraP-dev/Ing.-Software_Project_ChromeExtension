// HU-RF-013: pruebas de la API del historial (/logs).
//
// Usan el backend real y la base de datos MySQL configurada en backend/.env.
// Crean dos usuarios de prueba y los borran al terminar.
//
// Uso (desde la carpeta backend/, para que se lea su .env):
//   node --test ../tests/historial/logs.test.js
//
// Para correr todas las del historial juntas (una a la vez, porque dos de
// ellas usan el puerto 3000):
//   node --test --test-concurrency=1 ../tests/historial/*.test.js

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { cleanupTestUsers } = require("./limpieza");

const BACKEND_SRC = path.join(__dirname, "..", "..", "backend", "src");

const TEST_EMAILS = "prueba-historial-%@fillpro.test";

// Sin base de datos configurada (por ejemplo, al correr `npm test` desde la
// raíz) las pruebas se omiten en lugar de fallar
const SKIP_REASON = process.env.DB_NAME || fs.existsSync(path.join(process.cwd(), ".env"))
    ? false
    : "requiere MySQL y backend/.env: ejecutar desde la carpeta backend/";

describe("API del historial (/logs)", { skip: SKIP_REASON }, () => {
    let app;
    let db;
    let server;
    let baseUrl;

    async function request(method, route, { token, body } = {}) {
        const headers = { "Content-Type": "application/json" };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${baseUrl}${route}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        return { status: response.status, data: await response.json() };
    }

    async function createUser(label) {
        const email = `prueba-historial-${label}-${Date.now()}@fillpro.test`;
        const password = "clave-de-prueba-123";

        const registered = await request("POST", "/auth/register", { body: { email, password } });
        const loggedIn = await request("POST", "/auth/login", { body: { email, password } });

        const user = { id: registered.data.userId, token: loggedIn.data.token };
        return user;
    }

    before(async () => {
        app = require(path.join(BACKEND_SRC, "app"));
        db = require(path.join(BACKEND_SRC, "config", "database"));
        await cleanupTestUsers(db, TEST_EMAILS);

        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
        if (db) {
            await cleanupTestUsers(db, TEST_EMAILS);
            await db.end();
        }
        server?.close();
    });

    it("rechaza las peticiones sin token", async () => {
        assert.equal((await request("GET", "/logs")).status, 401);
        assert.equal((await request("POST", "/logs", { body: { website: "ejemplo.com" } })).status, 401);
        assert.equal((await request("DELETE", "/logs")).status, 401);
    });

    it("rechaza un registro sin sitio web", async () => {
        const user = await createUser("validacion");

        const response = await request("POST", "/logs", {
            token: user.token,
            body: { fieldsCompleted: ["firstName"] }
        });

        assert.equal(response.status, 400);
    });

    it("guarda solo el dominio y lo devuelve con fecha y campos", async () => {
        const user = await createUser("dominio");

        const created = await request("POST", "/logs", {
            token: user.token,
            body: {
                website: "https://www.linkedin.com/jobs/view/123?codigo=privado",
                fieldsCompleted: ["firstName", "lastName"]
            }
        });
        assert.equal(created.status, 201);

        const { status, data } = await request("GET", "/logs", { token: user.token });

        assert.equal(status, 200);
        assert.equal(data.length, 1);
        assert.equal(data[0].website, "www.linkedin.com");
        assert.deepEqual(data[0].fieldsCompleted, ["firstName", "lastName"]);
        assert.ok(!Number.isNaN(Date.parse(data[0].date)), "la fecha no es válida");
    });

    it("devuelve el historial del más reciente al más antiguo", async () => {
        const user = await createUser("orden");

        for (const website of ["primero.com", "segundo.com", "tercero.com"]) {
            await request("POST", "/logs", { token: user.token, body: { website, fieldsCompleted: [] } });
        }

        const { data } = await request("GET", "/logs", { token: user.token });

        assert.deepEqual(data.map((log) => log.website), ["tercero.com", "segundo.com", "primero.com"]);
    });

    it("borra solo el historial del usuario que lo pide", async () => {
        const ana = await createUser("ana");
        const luis = await createUser("luis");

        await request("POST", "/logs", { token: ana.token, body: { website: "ana.com", fieldsCompleted: ["phone"] } });
        await request("POST", "/logs", { token: luis.token, body: { website: "luis.com", fieldsCompleted: ["city"] } });

        // Luis no ve el historial de Ana
        const luisLogs = await request("GET", "/logs", { token: luis.token });
        assert.deepEqual(luisLogs.data.map((log) => log.website), ["luis.com"]);

        const deleted = await request("DELETE", "/logs", { token: ana.token });
        assert.equal(deleted.status, 200);
        assert.equal(deleted.data.deleted, 1);

        assert.deepEqual((await request("GET", "/logs", { token: ana.token })).data, []);
        assert.equal((await request("GET", "/logs", { token: luis.token })).data.length, 1);
    });
});
