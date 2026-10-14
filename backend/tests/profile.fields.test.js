/**
 * Pruebas de la definición y validación de campos del perfil (HU-RNF-011).
 * No requieren MySQL: validan la lógica pura de backend/src/models/profile.fields.js.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
    PROFILE_FIELDS,
    sanitizeProfileInput,
    buildSelectColumns
} = require("../src/models/profile.fields");

test("acepta un perfil completo y lo indexa por columna", () => {
    const { values, skills, errors } = sanitizeProfileInput({
        firstName: "  Juan Carlos ",
        lastName: "Pérez Gómez",
        email: "juan.perez@correo.com",
        documentType: "cc",
        birthDate: "1995-05-10",
        yearsExperience: "4",
        salaryExpectation: 4500000,
        educationLevel: "Universitario",
        graduationYear: "2019",
        skills: ["JavaScript", " javascript ", "", "SQL"]
    });

    assert.deepEqual(errors, []);
    assert.equal(values.first_name, "Juan Carlos");
    assert.equal(values.document_type, "CC");
    assert.equal(values.birth_date, "1995-05-10");
    assert.equal(values.years_experience, 4);
    assert.equal(values.salary_expectation, 4500000);
    assert.equal(values.education_level, "universitario");
    assert.equal(values.graduation_year, 2019);
    assert.equal(values.portfolio, null, "los campos ausentes se guardan como NULL");
    assert.deepEqual(skills, ["JavaScript", "SQL"]);
});

test("es compatible con el cuerpo del MVP (solo los 7 campos originales)", () => {
    const { values, errors } = sanitizeProfileInput({
        firstName: "Ana", lastName: "Ruiz", phone: "3001112233", country: "Colombia",
        city: "Bogotá", linkedin: "linkedin.com/in/ana", github: "ana"
    });
    assert.deepEqual(errors, []);
    assert.equal(values.city, "Bogotá");
    assert.equal(values.headline, null);
});

test("rechaza valores inválidos con mensajes claros", () => {
    const { errors } = sanitizeProfileInput({
        email: "no-es-correo",
        birthDate: "1995-02-30",
        yearsExperience: "-1",
        graduationYear: "1800",
        documentType: "XYZ",
        firstName: "x".repeat(101)
    });

    assert.equal(errors.length, 6);
    assert.ok(errors.some((error) => error.includes("email")));
    assert.ok(errors.some((error) => error.includes("birthDate")));
    assert.ok(errors.some((error) => error.includes("documentType")));
});

test("el SELECT formatea las fechas y no usa SELECT *", () => {
    const columns = buildSelectColumns();
    assert.match(columns, /DATE_FORMAT\(birth_date, '%Y-%m-%d'\) AS birth_date/);
    assert.match(columns, /^id, user_id, /);
    assert.doesNotMatch(columns, /\*/);
});

test("schema.sql y la migración contienen todas las columnas del perfil", () => {
    const schema = fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8");
    const migration = fs.readFileSync(
        path.join(__dirname, "../database/migrations/profile_fields.sql"),
        "utf8"
    );
    const original = new Set(["first_name", "last_name", "phone", "country", "city", "linkedin", "github"]);

    for (const field of PROFILE_FIELDS) {
        assert.match(schema, new RegExp(`\\n\\s+${field.column} `), `schema.sql: falta ${field.column}`);
        if (!original.has(field.column)) {
            assert.match(migration, new RegExp(`ADD COLUMN ${field.column} `), `migración: falta ${field.column}`);
        }
    }
});
