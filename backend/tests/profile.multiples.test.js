/**
 * Pruebas de la funcionalidad de múltiples perfiles por usuario.
 * No requieren MySQL: validan la coherencia del esquema/migración y que
 * las rutas de perfiles existan y usen el middleware de autenticación.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schemaPath = path.join(__dirname, "../database/schema.sql");
const migrationPath = path.join(__dirname, "../database/migrations/profile_name.sql");
const routesPath = path.join(__dirname, "../src/routes/profile.routes.js");

test("schema.sql incluye la columna profile_name", () => {
    const schema = fs.readFileSync(schemaPath, "utf8");
    assert.match(schema, /profile_name VARCHAR\(100\)/, "falta la columna profile_name en schema.sql");
});

test("existe la migración profile_name y agrega la columna", () => {
    assert.ok(fs.existsSync(migrationPath), "falta backend/database/migrations/profile_name.sql");
    const migration = fs.readFileSync(migrationPath, "utf8");
    assert.match(migration, /ADD COLUMN profile_name VARCHAR\(100\)/);
});

test("las rutas de múltiples perfiles están definidas", () => {
    const routes = fs.readFileSync(routesPath, "utf8");
    // Listar perfiles
    assert.match(routes, /router\.get\(\s*["']\/list["']/, "falta GET /profile/list");
    // Crear perfil nuevo
    assert.match(routes, /router\.post\(\s*["']\/create["']/, "falta POST /profile/create");
    // Obtener/guardar un perfil concreto siguen existiendo
    assert.match(routes, /router\.get\(\s*["']\/["']/, "falta GET /profile");
    assert.match(routes, /router\.post\(\s*["']\/["']/, "falta POST /profile");
});

test("todas las rutas de perfil exigen autenticación (verifyToken)", () => {
    const routes = fs.readFileSync(routesPath, "utf8");
    // Cada router.get/post debe incluir verifyToken como middleware.
    const handlers = routes.match(/router\.(get|post)\([^)]*\)/g) || [];
    assert.ok(handlers.length >= 4, "se esperaban al menos 4 handlers de ruta");
    for (const handler of handlers) {
        assert.match(handler, /verifyToken/, `una ruta no usa verifyToken: ${handler}`);
    }
});

test("resolveProfileId valida la pertenencia por user_id (no permite id ajeno)", () => {
    const routes = fs.readFileSync(routesPath, "utf8");
    // La consulta que resuelve un id explícito filtra por user_id para evitar
    // que un usuario lea perfiles de otro.
    assert.match(
        routes,
        /FROM profiles WHERE id = \? AND user_id = \?/,
        "la validación de id de perfil debe filtrar también por user_id"
    );
});
