/**
 * Carga los content scripts de la extensión dentro de un DOM simulado (jsdom),
 * en el MISMO orden que declara manifest.json. Así las pruebas verifican
 * también que el orden de carga del manifest es válido.
 */
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const EXTENSION_DIR = path.resolve(__dirname, "../../../extension");
const manifest = JSON.parse(fs.readFileSync(path.join(EXTENSION_DIR, "manifest.json"), "utf8"));
const CONTENT_SCRIPTS = manifest.content_scripts[0].js;

function readExtensionFile(relativePath) {
    return fs.readFileSync(path.join(EXTENSION_DIR, relativePath), "utf8");
}

/**
 * @param {string} html
 * @param {{ url?: string, includeContentScript?: boolean }} [options]
 */
function loadExtension(html, { url = "https://empleos.example.com/apply", includeContentScript = false } = {}) {
    const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true });
    const { window } = dom;
    const listeners = [];

    window.chrome = {
        runtime: {
            onMessage: { addListener: (listener) => listeners.push(listener) }
        }
    };

    for (const file of CONTENT_SCRIPTS) {
        if (file === "content.js" && !includeContentScript) {
            continue;
        }
        window.eval(readExtensionFile(file));
    }

    /** Simula chrome.tabs.sendMessage desde el popup. */
    function sendMessage(message) {
        let response;
        for (const listener of listeners) {
            listener(message, {}, (value) => { response = value; });
        }
        return response;
    }

    return { dom, window, document: window.document, FillPro: window.FillPro, sendMessage };
}

function loadFixture(relativePath, options) {
    return loadExtension(readExtensionFile(relativePath), options);
}

/** Perfil tal como lo devuelve GET /profile (snake_case de MySQL). */
function sampleApiResponse() {
    return {
        profile: {
            id: 1,
            user_id: 1,
            first_name: "Juan Carlos",
            last_name: "Pérez Gómez",
            email: "juan.perez@correo.com",
            phone: "+57 300 123 4567",
            document_type: "CC",
            document_number: "1020304050",
            birth_date: "1995-05-10",
            country: "Colombia",
            state: "Antioquia",
            city: "Medellín",
            address: "Calle 10 # 20-30",
            postal_code: "050001",
            headline: "Desarrollador Full Stack | Node.js · React",
            summary: "Desarrollador con 4 años de experiencia construyendo APIs y aplicaciones web.",
            current_title: "Desarrollador Backend",
            current_company: "Acme S.A.S.",
            years_experience: 4,
            salary_expectation: 4500000,
            education_level: "universitario",
            institution: "Universidad Nacional de Colombia",
            field_of_study: "Ingeniería de Sistemas",
            graduation_year: 2019,
            languages: "Español (nativo), Inglés (B2)",
            linkedin: "linkedin.com/in/juanperez",
            github: "juanperez",
            portfolio: "juanperez.dev",
            updated_at: "2026-10-01T10:00:00.000Z"
        },
        skills: ["JavaScript", "Node.js", "SQL"],
        accountEmail: "cuenta@correo.com"
    };
}

/**
 * Los objetos creados dentro de jsdom pertenecen a otro "realm" (otros
 * Array/Object.prototype), por lo que deepStrictEqual los considera distintos
 * aunque tengan el mismo contenido. Se clonan al realm de Node.
 */
const plain = (value) => structuredClone(value);

module.exports = { loadExtension, loadFixture, sampleApiResponse, readExtensionFile, plain, CONTENT_SCRIPTS };
