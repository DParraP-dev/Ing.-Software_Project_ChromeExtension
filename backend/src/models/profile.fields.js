/**
 * Definición única de los campos del perfil (HU-RNF-011).
 *
 * Cada entrada relaciona la clave camelCase que viaja en la API con la
 * columna snake_case de la tabla `profiles`, junto con sus reglas de
 * validación. Agregar un campo nuevo al perfil = agregar una entrada aquí
 * + su columna en la base de datos; las rutas se construyen a partir de
 * esta lista.
 */

const DOCUMENT_TYPES = ["CC", "CE", "TI", "PA", "PPT", "DNI", "RUT", "CURP", "OTRO"];

const EDUCATION_LEVELS = [
    "bachillerato",
    "tecnico",
    "tecnologo",
    "universitario",
    "especializacion",
    "maestria",
    "doctorado"
];

const PROFILE_FIELDS = [
    // Datos personales
    { key: "firstName", column: "first_name", type: "string", maxLength: 100 },
    { key: "lastName", column: "last_name", type: "string", maxLength: 100 },
    { key: "email", column: "email", type: "email", maxLength: 150 },
    { key: "phone", column: "phone", type: "string", maxLength: 20 },
    { key: "documentType", column: "document_type", type: "enum", values: DOCUMENT_TYPES },
    { key: "documentNumber", column: "document_number", type: "string", maxLength: 30 },
    { key: "birthDate", column: "birth_date", type: "date" },

    // Ubicación
    { key: "country", column: "country", type: "string", maxLength: 100 },
    { key: "state", column: "state", type: "string", maxLength: 100 },
    { key: "city", column: "city", type: "string", maxLength: 100 },
    { key: "address", column: "address", type: "string", maxLength: 255 },
    { key: "postalCode", column: "postal_code", type: "string", maxLength: 20 },

    // Perfil profesional / experiencia
    { key: "headline", column: "headline", type: "string", maxLength: 150 },
    { key: "summary", column: "summary", type: "string", maxLength: 2000 },
    { key: "currentTitle", column: "current_title", type: "string", maxLength: 150 },
    { key: "currentCompany", column: "current_company", type: "string", maxLength: 150 },
    { key: "yearsExperience", column: "years_experience", type: "integer", min: 0, max: 70 },
    { key: "salaryExpectation", column: "salary_expectation", type: "integer", min: 0, max: 4294967295 },

    // Educación
    { key: "educationLevel", column: "education_level", type: "enum", values: EDUCATION_LEVELS },
    { key: "institution", column: "institution", type: "string", maxLength: 150 },
    { key: "fieldOfStudy", column: "field_of_study", type: "string", maxLength: 150 },
    { key: "graduationYear", column: "graduation_year", type: "integer", min: 1950, max: 2100 },
    { key: "languages", column: "languages", type: "string", maxLength: 255 },

    // Enlaces
    { key: "linkedin", column: "linkedin", type: "string", maxLength: 255 },
    { key: "github", column: "github", type: "string", maxLength: 255 },
    { key: "portfolio", column: "portfolio", type: "string", maxLength: 255 }
];

const MAX_SKILLS = 50;
const MAX_SKILL_LENGTH = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidIsoDate(value) {
    const match = DATE_PATTERN.exec(value);
    if (!match) {
        return false;
    }

    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

function sanitizeField(field, rawValue) {
    if (rawValue === undefined || rawValue === null) {
        return { value: null };
    }

    const text = String(rawValue).trim();
    if (text === "") {
        return { value: null };
    }

    switch (field.type) {
        case "integer": {
            const number = Number(text);
            if (!Number.isInteger(number) || number < field.min || number > field.max) {
                return { error: `${field.key} debe ser un número entero entre ${field.min} y ${field.max}` };
            }
            return { value: number };
        }
        case "date":
            return isValidIsoDate(text)
                ? { value: text }
                : { error: `${field.key} debe tener el formato AAAA-MM-DD` };
        case "enum": {
            const match = field.values.find((option) => option.toLowerCase() === text.toLowerCase());
            return match
                ? { value: match }
                : { error: `${field.key} debe ser uno de: ${field.values.join(", ")}` };
        }
        case "email":
            if (!EMAIL_PATTERN.test(text) || text.length > field.maxLength) {
                return { error: `${field.key} no es un correo válido` };
            }
            return { value: text };
        default:
            if (text.length > field.maxLength) {
                return { error: `${field.key} admite máximo ${field.maxLength} caracteres` };
            }
            return { value: text };
    }
}

function sanitizeSkills(rawSkills) {
    if (!Array.isArray(rawSkills)) {
        return [];
    }

    const unique = new Map();
    for (const skill of rawSkills) {
        const text = String(skill ?? "").trim().slice(0, MAX_SKILL_LENGTH);
        if (text && !unique.has(text.toLowerCase())) {
            unique.set(text.toLowerCase(), text);
        }
    }

    return Array.from(unique.values()).slice(0, MAX_SKILLS);
}

/**
 * Valida y normaliza el cuerpo de POST /profile.
 * Los campos ausentes o vacíos se guardan como NULL (reemplazo completo,
 * igual que el comportamiento previo del endpoint).
 *
 * @returns {{ values: Record<string, unknown>, skills: string[], errors: string[] }}
 *          `values` está indexado por nombre de columna.
 */
function sanitizeProfileInput(body = {}) {
    const values = {};
    const errors = [];

    for (const field of PROFILE_FIELDS) {
        const result = sanitizeField(field, body[field.key]);
        if (result.error) {
            errors.push(result.error);
        } else {
            values[field.column] = result.value;
        }
    }

    return { values, skills: sanitizeSkills(body.skills), errors };
}

/** Lista de columnas para el SELECT (fechas formateadas para evitar desfases de zona horaria). */
function buildSelectColumns() {
    const columns = PROFILE_FIELDS.map((field) => (field.type === "date"
        ? `DATE_FORMAT(${field.column}, '%Y-%m-%d') AS ${field.column}`
        : field.column));

    return ["id", "user_id", ...columns, "updated_at"].join(", ");
}

module.exports = {
    PROFILE_FIELDS,
    DOCUMENT_TYPES,
    EDUCATION_LEVELS,
    sanitizeProfileInput,
    buildSelectColumns
};
