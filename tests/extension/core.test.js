/**
 * Pruebas unitarias del núcleo (sin lógica de DOM): texto, adaptación del
 * perfil y formateo de valores.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadExtension, sampleApiResponse, plain } = require("./helpers/loadExtension");

const { FillPro } = loadExtension("<!DOCTYPE html><html><body></body></html>");

test.describe("text", () => {
    const { tokenize, containsPhrase, normalizeText } = FillPro.text;

    test("separa camelCase, guiones, corchetes y elimina tildes", () => {
        assert.deepEqual(plain(tokenize("linkedInProfile")), ["linked", "in", "profile"]);
        assert.deepEqual(plain(tokenize("urls[GitHub]")), ["urls", "git", "hub"]);
        assert.equal(normalizeText("Teléfono_Celular"), "telefono celular");
        assert.deepEqual(plain(tokenize("phoneNumber-nationalNumber")), ["phone", "number", "national", "number"]);
    });

    test("compara frases completas, no subcadenas", () => {
        assert.equal(containsPhrase("Hotel", "tel"), false);
        assert.equal(containsPhrase("tel", "tel"), true);
        assert.equal(containsPhrase("E-mail address", "email"), true);
        assert.equal(containsPhrase("urls[LinkedIn]", "linkedin"), true);
    });

    test("tolera plurales simples", () => {
        assert.equal(containsPhrase("Apellidos", "apellido"), true);
        assert.equal(containsPhrase("Nombres", "nombre"), true);
    });
});

test.describe("profileAdapter", () => {
    const { toCanonicalProfile, parsePhone, toProfileUrl } = FillPro.profileAdapter;

    test("convierte snake_case de la API y deriva formatos de portales", () => {
        const { profile, skills, accountEmail } = sampleApiResponse();
        const canonical = toCanonicalProfile(profile, { skills, accountEmail });

        assert.equal(canonical.firstName, "Juan Carlos");
        assert.equal(canonical.fullName, "Juan Carlos Pérez Gómez");
        assert.equal(canonical.firstGivenName, "Juan");
        assert.equal(canonical.middleName, "Carlos");
        assert.equal(canonical.firstSurname, "Pérez");
        assert.equal(canonical.secondSurname, "Gómez");
        assert.equal(canonical.phoneNational, "3001234567");
        assert.equal(canonical.phoneCountryCode, "+57");
        assert.equal(canonical.location, "Medellín, Antioquia, Colombia");
        assert.equal(canonical.yearsExperience, "4");
        assert.equal(canonical.skills, "JavaScript, Node.js, SQL");
        assert.equal(canonical.email, "juan.perez@correo.com");
    });

    test("acepta el formato camelCase anterior (compatibilidad con el MVP)", () => {
        const canonical = toCanonicalProfile({ firstName: "Ana", lastName: "Ruiz", phone: "3001112233", country: "Colombia" });
        assert.equal(canonical.fullName, "Ana Ruiz");
        assert.equal(canonical.phoneNational, "3001112233");
        assert.equal(canonical.phoneCountryCode, "+57");
        assert.equal(canonical.middleName, null);
    });

    test("usa el correo de la cuenta si el perfil no tiene correo de contacto", () => {
        const canonical = toCanonicalProfile({ first_name: "Ana" }, { accountEmail: "cuenta@correo.com" });
        assert.equal(canonical.email, "cuenta@correo.com");
    });

    test("normaliza teléfonos internacionales", () => {
        assert.deepEqual(plain(parsePhone("+52 55 1234 5678", null)), { national: "5512345678", dial: "52" });
        assert.deepEqual(plain(parsePhone("0057 300 123 4567", null)), { national: "3001234567", dial: "57" });
        assert.deepEqual(plain(parsePhone("300-123-4567", FillPro.countries.findCountry("CO"))), { national: "3001234567", dial: "57" });
    });

    test("completa URLs de LinkedIn, GitHub y portafolio", () => {
        assert.equal(toProfileUrl("juanperez", "www.linkedin.com", "in/"), "https://www.linkedin.com/in/juanperez");
        assert.equal(toProfileUrl("linkedin.com/in/juan", "www.linkedin.com", "in/"), "https://linkedin.com/in/juan");
        assert.equal(toProfileUrl("https://github.com/juan", "github.com", ""), "https://github.com/juan");
        assert.equal(toCanonicalProfile({ portfolio: "juan.dev" }).portfolio, "https://juan.dev");
    });
});

test.describe("valueFormatter", () => {
    const { formatInputValue, formatDate, parseRange, chooseOption } = FillPro.valueFormatter;
    const profile = FillPro.profileAdapter.toCanonicalProfile(sampleApiResponse().profile);
    const options = (...texts) => texts.map((text, index) => ({ value: String(index), text, index }));

    test("formatea fechas según el placeholder", () => {
        assert.equal(formatDate("1995-05-10", "dd/mm/aaaa"), "10/05/1995");
        assert.equal(formatDate("1995-05-10", "MM-DD-YYYY"), "05-10-1995");
        assert.equal(formatDate("1995-05-10", ""), "10/05/1995");
        assert.equal(formatInputValue("birthDate", profile, { kind: "date" }), "1995-05-10");
    });

    test("usa solo dígitos en inputs numéricos y respeta maxlength", () => {
        assert.equal(formatInputValue("salaryExpectation", profile, { kind: "number" }), "4500000");
        assert.equal(formatInputValue("firstName", profile, { kind: "number" }), null);
        assert.equal(formatInputValue("phone", profile, { kind: "tel", maxLength: 10 }), "3001234567");
        assert.equal(formatInputValue("summary", profile, { kind: "textarea", maxLength: 11 }), "Desarrollad");
        assert.equal(formatInputValue("email", profile, { kind: "email", maxLength: 5 }), null);
    });

    test("interpreta rangos numéricos de las opciones", () => {
        assert.deepEqual(plain(parseRange("Sin experiencia")), { min: 0, max: 0 });
        assert.deepEqual(plain(parseRange("3 a 5 años")), { min: 3, max: 5 });
        assert.deepEqual(plain(parseRange("Entre 1 y 2 años")), { min: 1, max: 2 });
        assert.deepEqual(plain(parseRange("$1.000.000 - $2.000.000")), { min: 1000000, max: 2000000 });
        assert.deepEqual(plain(parseRange("10+ years")), { min: 10, max: Infinity });
        assert.equal(parseRange("Menos de 1 año").maxExclusive, true);
        assert.equal(parseRange("Más de 10 años").minExclusive, true);
        assert.equal(parseRange("Prefiero no decirlo"), null);
    });

    test("elige opciones equivalentes en <select>", () => {
        assert.equal(chooseOption("educationLevel", profile, options("Select", "High school", "Bachelor's Degree", "Master's Degree")), 2);
        assert.equal(chooseOption("documentType", profile, options("Seleccione", "Cédula de extranjería", "Cédula de ciudadanía")), 2);
        assert.equal(chooseOption("country", profile, [{ value: "", text: "País", index: 0 }, { value: "MX", text: "Mexique", index: 1 }, { value: "CO", text: "Colombie", index: 2 }]), 2);
        assert.equal(chooseOption("phoneCountryCode", profile, options("Select an option", "Mexico (+52)", "Colombia (+57)")), 2);
        assert.equal(chooseOption("yearsExperience", profile, options("Selecciona", "Menos de 1 año", "1 a 3", "4 a 6", "Más de 6")), 3);
        assert.equal(chooseOption("salaryExpectation", profile, options("--", "$1.000.000 - $3.000.000", "$3.000.000 - $5.000.000")), 2);
    });

    test("no confunde ids numéricos de las opciones con el dato", () => {
        // value="4" es un id interno; 4 años debe caer en "3 a 5 años".
        const select = [
            { value: "", text: "Selecciona", index: 0 },
            { value: "3", text: "3 a 5 años", index: 1 },
            { value: "4", text: "6 a 10 años", index: 2 }
        ];
        assert.equal(chooseOption("yearsExperience", profile, select), 1);
    });

    test("devuelve -1 si ninguna opción corresponde", () => {
        assert.equal(chooseOption("educationLevel", profile, options("Selecciona", "Primaria")), -1);
    });
});
