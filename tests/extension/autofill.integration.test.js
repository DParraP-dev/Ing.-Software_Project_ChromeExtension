/**
 * Pruebas de integración: content scripts completos (en el orden del
 * manifest) sobre réplicas de formularios de LinkedIn, Computrabajo y ATS.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadExtension, loadFixture, sampleApiResponse, plain } = require("./helpers/loadExtension");

const valueOf = (document, selector) => {
    const element = document.querySelector(selector);
    return element.tagName === "SELECT" ? element.options[element.selectedIndex].textContent.trim() : element.value;
};

test.describe("Computrabajo (réplica de hoja de vida)", () => {
    const { document, FillPro } = loadFixture("test-forms/computrabajo-hoja-de-vida.html", {
        url: "https://co.computrabajo.com/candidato/hoja-de-vida"
    });
    const result = FillPro.autofillService.run(sampleApiResponse());

    test("detecta el portal", () => {
        assert.equal(result.site, "Computrabajo");
        assert.equal(result.filled, 21);
    });

    test("completa datos personales y de contacto", () => {
        assert.equal(valueOf(document, "#Name"), "Juan Carlos");
        assert.equal(valueOf(document, "#Surname"), "Pérez Gómez");
        assert.equal(valueOf(document, "#Email"), "juan.perez@correo.com");
        assert.equal(valueOf(document, "[name='Phone1']"), "3001234567", "Computrabajo pide el celular sin indicativo");
        assert.equal(valueOf(document, "#IdentificationType"), "Cédula de Ciudadanía");
        assert.equal(valueOf(document, "#IdentificationNumber"), "1020304050");
        assert.equal(valueOf(document, "#BirthDate"), "10/05/1995");
    });

    test("adapta la ubicación a los selects del portal", () => {
        assert.equal(valueOf(document, "#CountryId"), "Colombia");
        assert.equal(valueOf(document, "#LocationId"), "Antioquia");
        assert.equal(valueOf(document, "#City"), "Medellín");
        assert.equal(valueOf(document, "#Address"), "Calle 10 # 20-30");
    });

    test("adapta experiencia, salario y educación a rangos/opciones", () => {
        assert.equal(valueOf(document, "#JobTitle"), "Desarrollador Backend");
        assert.equal(valueOf(document, "#CompanyName"), "Acme S.A.S.");
        assert.equal(valueOf(document, "#ExperienceYears"), "3 a 5 años");
        assert.equal(valueOf(document, "#Salary"), "$3.500.000 - $5.000.000");
        assert.equal(valueOf(document, "#StudyLevel"), "Universitario");
        assert.equal(valueOf(document, "#Institution"), "Universidad Nacional de Colombia");
        assert.equal(valueOf(document, "#Degree"), "Ingeniería de Sistemas");
        assert.equal(valueOf(document, "#Languages"), "Español (nativo), Inglés (B2)");
        assert.equal(valueOf(document, "#Knowledge"), "JavaScript, Node.js, SQL");
        assert.match(valueOf(document, "#Presentation"), /^Desarrollador con 4 años/);
    });

    test("no toca buscadores ni la sección de referencias", () => {
        assert.equal(valueOf(document, "#prof-cat-search-input"), "");
        assert.equal(valueOf(document, "#place-search-input"), "");
        assert.equal(valueOf(document, "#RefName"), "");
        assert.equal(valueOf(document, "#RefPhone"), "");
    });
});

test.describe("LinkedIn (réplica de Easy Apply)", () => {
    for (const url of ["https://www.linkedin.com/jobs/view/123", "http://localhost:5500/linkedin-easy-apply.html"]) {
        test(`completa el modal en ${new URL(url).hostname}`, () => {
            const { document, FillPro } = loadFixture("test-forms/linkedin-easy-apply.html", { url });
            const result = FillPro.autofillService.run(sampleApiResponse());

            assert.deepEqual(
                [...result.fields].sort(),
                ["email", "firstName", "lastName", "linkedin", "location", "phoneCountryCode", "phoneNational"]
            );
            assert.equal(valueOf(document, "[id$='-firstName']"), "Juan Carlos");
            assert.equal(valueOf(document, "[id$='-lastName']"), "Pérez Gómez");
            assert.equal(valueOf(document, "[id$='-multipleChoice']"), "juan.perez@correo.com");
            assert.equal(valueOf(document, "[id$='phoneNumber-country']"), "Colombia (+57)");
            assert.equal(valueOf(document, "[id$='phoneNumber-nationalNumber']"), "3001234567");
            assert.equal(valueOf(document, "[id$='city-HOME-CITY']"), "Medellín, Antioquia, Colombia");
            assert.equal(valueOf(document, "[id$='-117-text']"), "https://linkedin.com/in/juanperez");
            assert.equal(valueOf(document, "[id$='-116-numeric']"), "", "pregunta específica de una tecnología");
            assert.equal(valueOf(document, ".search-global-typeahead__input"), "", "buscador global");
            assert.equal(document.querySelector("input[type='radio']:checked"), null);
        });
    }

    test("en LinkedIn solo trabaja dentro del diálogo abierto", () => {
        const { document, FillPro } = loadExtension(`
            <input aria-label="Nombre" id="outside">
            <div role="dialog" aria-modal="true"><label for="inside">First name</label><input id="inside"></div>`,
        { url: "https://www.linkedin.com/in/me/edit/intro/" });
        FillPro.autofillService.run(sampleApiResponse());
        assert.equal(document.getElementById("inside").value, "Juan Carlos");
        assert.equal(document.getElementById("outside").value, "");
    });
});

test.describe("ATS (Lever, Greenhouse, Workday)", () => {
    test("Lever: nombre completo, empresa y URLs", () => {
        const { document, FillPro } = loadExtension(`
            <form>
                <input name="name"><input name="email"><input name="phone"><input name="org">
                <input name="urls[LinkedIn]"><input name="urls[GitHub]"><input name="urls[Portfolio]">
            </form>`, { url: "https://jobs.lever.co/acme/123/apply" });
        const result = FillPro.autofillService.run(sampleApiResponse());
        assert.equal(result.site, "Lever");
        assert.equal(valueOf(document, "[name='name']"), "Juan Carlos Pérez Gómez");
        assert.equal(valueOf(document, "[name='org']"), "Acme S.A.S.");
        assert.equal(valueOf(document, "[name='urls[GitHub]']"), "https://github.com/juanperez");
        assert.equal(valueOf(document, "[name='urls[Portfolio]']"), "https://juanperez.dev");
    });

    test("Greenhouse: ids estándar", () => {
        const { document, FillPro } = loadExtension(`
            <form><input id="first_name"><input id="last_name"><input id="email"><input id="phone"></form>`,
        { url: "https://job-boards.greenhouse.io/acme/jobs/1" });
        FillPro.autofillService.run(sampleApiResponse());
        assert.equal(valueOf(document, "#first_name"), "Juan Carlos");
        assert.equal(valueOf(document, "#phone"), "+57 300 123 4567");
    });

    test("Workday: data-automation-id y teléfono nacional", () => {
        const { document, FillPro } = loadExtension(`
            <form>
                <input data-automation-id="legalNameSection_firstName">
                <input data-automation-id="legalNameSection_lastName">
                <input data-automation-id="addressSection_city">
                <input data-automation-id="phone-number">
            </form>`, { url: "https://acme.wd5.myworkdayjobs.com/es/careers/apply" });
        FillPro.autofillService.run(sampleApiResponse());
        assert.equal(valueOf(document, "[data-automation-id='legalNameSection_lastName']"), "Pérez Gómez");
        assert.equal(valueOf(document, "[data-automation-id='addressSection_city']"), "Medellín");
        assert.equal(valueOf(document, "[data-automation-id='phone-number']"), "3001234567");
    });
});

test.describe("compatibilidad con el DOM de la página", () => {
    test("formulario de prueba original del MVP sigue funcionando", () => {
        const { FillPro } = loadFixture("test-form.html", { url: "http://localhost:5500/test-form.html" });
        const result = FillPro.autofillService.run(sampleApiResponse());
        assert.deepEqual(
            [...result.fields].sort(),
            ["city", "country", "firstName", "github", "lastName", "linkedin", "phone"]
        );
    });

    test("dispara los eventos de un usuario real con el setter nativo (React/Angular/Vue)", () => {
        const { document, window, FillPro } = loadExtension("<label for='n'>Nombre</label><input id='n'>");
        const input = document.getElementById("n");
        const events = [];
        for (const type of ["focus", "focusin", "input", "change", "blur", "focusout"]) {
            input.addEventListener(type, (event) => events.push(`${type}:${event.bubbles}`));
        }

        // React redefine `value` en la instancia; FillPro debe usar el setter del prototipo.
        let instanceSetterCalls = 0;
        const nativeDescriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        Object.defineProperty(input, "value", {
            configurable: true,
            get() { return nativeDescriptor.get.call(this); },
            set(value) { instanceSetterCalls += 1; nativeDescriptor.set.call(this, value); }
        });

        FillPro.autofillService.run(sampleApiResponse());

        assert.equal(input.value, "Juan Carlos");
        assert.equal(instanceSetterCalls, 0);
        assert.deepEqual(events, ["focus:false", "focusin:true", "input:true", "change:true", "blur:false", "focusout:true"]);
        assert.notEqual(document.activeElement, input, "no roba el foco");
    });

    test("no sobrescribe datos existentes salvo que se pida", () => {
        const html = "<label for='n'>Nombre</label><input id='n' value='Escrito por el usuario'>";
        const first = loadExtension(html);
        const result = first.FillPro.autofillService.run(sampleApiResponse());
        assert.equal(first.document.getElementById("n").value, "Escrito por el usuario");
        assert.equal(result.skipped, 1);

        const second = loadExtension(html);
        second.FillPro.autofillService.run(sampleApiResponse(), { overwrite: true });
        assert.equal(second.document.getElementById("n").value, "Juan Carlos");
    });

    test("ignora controles ocultos, deshabilitados y de solo lectura", () => {
        const { document, FillPro } = loadExtension(`
            <label for="a">Nombre</label><input id="a" disabled>
            <label for="b">Apellido</label><input id="b" readonly>
            <div style="display:none"><label for="c">Correo</label><input id="c"></div>
            <label for="d">Teléfono</label><input id="d" type="hidden">
            <label for="e">Ciudad</label><input id="e" aria-hidden="true">`);
        const result = FillPro.autofillService.run(sampleApiResponse());
        assert.equal(result.filled, 0);
        for (const id of ["a", "b", "c", "e"]) {
            assert.equal(document.getElementById(id).value, "");
        }
    });

    test("recorre Shadow DOM abierto e iframes del mismo origen", () => {
        const { document, FillPro } = loadExtension("<div id='host'></div><iframe id='frame'></iframe>");

        const shadow = document.getElementById("host").attachShadow({ mode: "open" });
        shadow.innerHTML = "<label for='s'>Correo electrónico</label><input id='s' type='email'>";

        const frameDocument = document.getElementById("frame").contentDocument;
        frameDocument.body.innerHTML = "<label for='i'>Apellidos</label><input id='i'>";

        const result = FillPro.autofillService.run(sampleApiResponse());
        assert.equal(shadow.getElementById("s").value, "juan.perez@correo.com");
        assert.equal(frameDocument.getElementById("i").value, "Pérez Gómez");
        assert.equal(result.filled, 2);
    });

    test("si hay campo de indicativo, el teléfono va sin indicativo (sitio genérico)", () => {
        const { document, FillPro } = loadExtension(`
            <form>
                <label for="cc">Código de país</label>
                <select id="cc"><option value="">--</option><option value="+52">+52</option><option value="+57">+57</option></select>
                <label for="p">Teléfono</label><input id="p" type="tel">
            </form>`);
        FillPro.autofillService.run(sampleApiResponse());
        assert.equal(valueOf(document, "#cc"), "+57");
        assert.equal(valueOf(document, "#p"), "3001234567");
    });

    test("campos que el perfil no tiene se omiten sin error", () => {
        const { document, FillPro } = loadExtension("<label for='g'>GitHub</label><input id='g'>");
        const result = FillPro.autofillService.run({ profile: { first_name: "Ana" } });
        assert.equal(result.filled, 0);
        assert.equal(document.getElementById("g").value, "");
    });
});

test.describe("content script (mensajería con el popup)", () => {
    test("responde al mensaje FILLPRO_AUTOFILL con el resultado", () => {
        const { document, sendMessage } = loadExtension("<label for='n'>Nombre</label><input id='n'>", {
            url: "https://co.computrabajo.com/",
            includeContentScript: true
        });
        const { profile, skills, accountEmail } = sampleApiResponse();
        const response = sendMessage({ type: "FILLPRO_AUTOFILL", profile, skills, accountEmail });

        assert.equal(response.ok, true);
        assert.equal(response.filled, 1);
        assert.equal(response.site, "Computrabajo");
        assert.deepEqual(plain(response.fields), ["firstName"]);
        assert.equal(document.getElementById("n").value, "Juan Carlos");
    });

    test("ignora mensajes de otro tipo", () => {
        const { sendMessage } = loadExtension("<input>", { includeContentScript: true });
        assert.equal(sendMessage({ type: "OTRO" }), undefined);
    });
});

test.describe("registro de portales (extensibilidad)", () => {
    test("resuelve portales por dominio y subdominio", () => {
        const { FillPro } = loadExtension("<p></p>");
        const resolve = (host) => FillPro.siteRegistry.resolve(host)?.id ?? null;
        assert.equal(resolve("www.linkedin.com"), "linkedin");
        assert.equal(resolve("co.computrabajo.com"), "computrabajo");
        assert.equal(resolve("candidato.mx.computrabajo.com"), "computrabajo");
        assert.equal(resolve("www.elempleo.com"), "elempleo");
        assert.equal(resolve("co.indeed.com"), "indeed");
        assert.equal(resolve("jobs.lever.co"), "lever");
        assert.equal(resolve("acme.wd3.myworkdayjobs.com"), "workday");
        assert.equal(resolve("notlinkedin.com"), null);
        assert.equal(resolve("example.com"), null);
    });

    test("un portal nuevo se agrega sin modificar el motor", () => {
        const { document, FillPro } = loadExtension("<input id='nombre-postulante-xyz'>", { url: "https://empleos.nuevo-portal.com/" });
        FillPro.siteRegistry.register({
            id: "nuevo-portal",
            name: "Nuevo portal",
            hostPatterns: [/(^|\.)nuevo-portal\.com$/],
            fieldRules: [{ key: "fullName", selectors: ["#nombre-postulante-xyz"] }]
        });
        const result = FillPro.autofillService.run(sampleApiResponse());
        assert.equal(result.site, "Nuevo portal");
        assert.equal(document.getElementById("nombre-postulante-xyz").value, "Juan Carlos Pérez Gómez");
    });

    test("rechaza reglas con claves que no existen en el catálogo", () => {
        const { FillPro } = loadExtension("<p></p>");
        assert.throws(() => FillPro.siteRegistry.register({
            id: "x",
            hostPatterns: [/x/],
            fieldRules: [{ key: "noExiste", selectors: ["input"] }]
        }), /clave desconocida/);
    });
});
