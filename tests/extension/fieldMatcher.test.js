/**
 * Pruebas del reconocimiento de campos con el vocabulario real de los
 * portales (es/en). Cada caso arma un control mínimo en el DOM y verifica
 * la clave del perfil que FillPro le asigna.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadExtension } = require("./helpers/loadExtension");

const { FillPro, document } = loadExtension("<!DOCTYPE html><html><body><form id='f'></form></body></html>");

function keyFor(html) {
    const form = document.getElementById("f");
    form.innerHTML = html;
    const element = form.querySelector("input, select, textarea");
    const match = FillPro.fieldMatcher.match(FillPro.fieldDescriptor.describe(element));
    return match ? match.key : null;
}

const labeled = (label, attrs = "", tag = "input") =>
    `<label for="x">${label}</label><${tag} id="x" ${attrs}>${tag === "input" ? "" : `</${tag}>`}`;

test.describe("reconoce los campos comunes de LinkedIn, Computrabajo y ATS", () => {
    const cases = [
        // Nombres
        [labeled("Nombre"), "firstName"],
        [labeled("First name"), "firstName"],
        [labeled("Apellidos"), "lastName"],
        [labeled("Last name"), "lastName"],
        [labeled("Nombre completo"), "fullName"],
        [labeled("Nombres y apellidos"), "fullName"],
        [labeled("Full name"), "fullName"],
        [labeled("Primer nombre"), "firstGivenName"],
        [labeled("Segundo nombre"), "middleName"],
        [labeled("Primer apellido"), "firstSurname"],
        [labeled("Segundo apellido"), "secondSurname"],
        // Contacto
        [labeled("Correo electrónico", "type='email'"), "email"],
        [labeled("Email address", "", "select"), "email"],
        [labeled("Teléfono celular", "type='tel'"), "phone"],
        [labeled("Mobile phone number"), "phone"],
        [labeled("WhatsApp"), "phone"],
        [labeled("Phone country code", "", "select"), "phoneCountryCode"],
        [labeled("Indicativo", "", "select"), "phoneCountryCode"],
        // Identificación
        [labeled("Tipo de documento", "", "select"), "documentType"],
        [labeled("Número de documento"), "documentNumber"],
        [labeled("Cédula"), "documentNumber"],
        [labeled("Fecha de nacimiento", "type='date'"), "birthDate"],
        // Ubicación
        [labeled("País de residencia", "", "select"), "country"],
        [labeled("Departamento", "", "select"), "state"],
        [labeled("Ciudad"), "city"],
        [labeled("Dirección de residencia"), "address"],
        [labeled("Código postal"), "postalCode"],
        [labeled("Location (city)"), "location"],
        // Profesional
        [labeled("Headline"), "headline"],
        [labeled("Acerca de mí", "", "textarea"), "summary"],
        [labeled("Cargo actual"), "currentTitle"],
        [labeled("Job title"), "currentTitle"],
        [labeled("Nombre de la empresa"), "currentCompany"],
        [labeled("Current company"), "currentCompany"],
        [labeled("Años de experiencia", "type='number'"), "yearsExperience"],
        [labeled("Aspiración salarial", "type='number'"), "salaryExpectation"],
        // Educación
        [labeled("Nivel de estudios", "", "select"), "educationLevel"],
        [labeled("Universidad"), "institution"],
        [labeled("Título obtenido"), "fieldOfStudy"],
        [labeled("Año de graduación", "type='number'"), "graduationYear"],
        [labeled("Idiomas"), "languages"],
        [labeled("Habilidades"), "skills"],
        // Enlaces
        [labeled("Perfil de LinkedIn", "type='url'"), "linkedin"],
        [labeled("GitHub"), "github"],
        [labeled("Sitio web personal", "type='url'"), "portfolio"]
    ];

    for (const [html, expected] of cases) {
        test(`${html.replace(/<[^>]+>/g, " ").trim()} -> ${expected}`, () => {
            assert.equal(keyFor(html), expected);
        });
    }
});

test.describe("usa atributos técnicos cuando no hay etiqueta", () => {
    test("name / id / autocomplete", () => {
        assert.equal(keyFor("<input name='first_name'>"), "firstName");
        assert.equal(keyFor("<input id='applicantLastName'>"), "lastName");
        assert.equal(keyFor("<input name='urls[LinkedIn]'>"), "linkedin");
        assert.equal(keyFor("<input autocomplete='given-name' name='f1'>"), "firstName");
        assert.equal(keyFor("<input autocomplete='section-a tel-national' name='f2'>"), "phoneNational");
        assert.equal(keyFor("<input data-automation-id='legalNameSection_firstName'>"), "firstName");
        assert.equal(keyFor("<input formcontrolname='correoElectronico'>"), "email");
    });

    test("texto del contenedor (formularios sin <label for>)", () => {
        assert.equal(keyFor("<div><span>Teléfono</span><input type='tel'></div>"), "phone");
        assert.equal(keyFor("<div><div class='lbl'>Ciudad de residencia</div><div><input></div></div>"), "city");
    });

    test("placeholder", () => {
        assert.equal(keyFor("<input placeholder='Tu correo electrónico'>"), "email");
    });
});

test.describe("evita falsos positivos", () => {
    const ignored = [
        ["buscadores", "<input aria-label='Buscar empleos' placeholder='Cargo o empresa'>"],
        ["buscador LinkedIn", "<input aria-label='Search' role='combobox'>"],
        ["contraseña", labeled("Contraseña")],
        ["pregunta de experiencia con una tecnología", labeled("How many years of work experience do you have with React?")],
        ["¿cómo nos conociste?", labeled("How did you hear about us?", "", "textarea")],
        ["nombre de usuario", labeled("Nombre de usuario")],
        ["nombre de un contacto", labeled("Nombre del contacto de emergencia")],
        ["archivos", "<label for='x'>Hoja de vida</label><input id='x' type='file'>"],
        ["casillas", "<label><input type='checkbox' name='terms'> Acepto</label>"]
    ];

    for (const [name, html] of ignored) {
        test(name, () => assert.equal(keyFor(html), null));
    }

    test("sección de referencias personales", () => {
        assert.equal(keyFor("<h3>Referencias personales</h3><div><label for='x'>Nombre</label><input id='x'></div>"), null);
    });

    test("'Nombre de la empresa' no es el nombre del candidato", () => {
        assert.notEqual(keyFor(labeled("Nombre de la empresa")), "firstName");
    });

    test("'Estado civil' no es el estado/departamento", () => {
        assert.notEqual(keyFor(labeled("Estado civil", "", "select")), "state");
    });

    test("'Ciudad de expedición' no es la ciudad de residencia", () => {
        assert.notEqual(keyFor(labeled("Ciudad de expedición del documento")), "city");
    });

    test("respeta el tipo de control: un textarea no recibe el teléfono", () => {
        assert.equal(keyFor(labeled("Teléfono", "", "textarea")), null);
    });
});

test.describe("reglas del portal", () => {
    test("una regla por selector es definitiva", () => {
        const form = document.getElementById("f");
        form.innerHTML = "<input id='abc-phoneNumber-nationalNumber'>";
        const element = form.querySelector("input");
        const site = FillPro.siteRegistry.resolve("www.linkedin.com");
        const key = FillPro.siteRegistry.ruleKeyFor(site, element);
        assert.equal(key, "phoneNational");
        assert.equal(FillPro.fieldMatcher.match(FillPro.fieldDescriptor.describe(element), { siteKey: key }).key, "phoneNational");
    });

    test("el vocabulario propio de un portal suma evidencia", () => {
        const form = document.getElementById("f");
        form.innerHTML = labeled("Municipio de residencia");
        const descriptor = FillPro.fieldDescriptor.describe(form.querySelector("input"));
        const result = FillPro.fieldMatcher.match(descriptor, { keywordHints: { city: ["municipio de residencia"] } });
        assert.equal(result.key, "city");
    });
});
