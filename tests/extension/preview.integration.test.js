/**
 * La vista previa usa el mismo catálogo y los mismos adaptadores que el motor,
 * pero solo escribe después de confirmar el snapshot del documento correcto.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadExtension, loadFixture, sampleApiResponse, plain } = require("./helpers/loadExtension");

function appFor(t, html, options = {}) {
    const app = loadExtension(html, { ...options, includeContentScript: true });
    t.after(() => app.window.close());
    return app;
}

function preview(app, payload = sampleApiResponse()) {
    const result = app.sendMessage({ type: "FILLPRO_PREVIEW", ...payload });
    assert.equal(result?.ok, true);
    assert.equal(typeof result.previewId, "string");
    return result;
}

function fieldFor(snapshot, key) {
    const field = snapshot.fields.find((item) => item.profileKey === key);
    assert.ok(field, `falta el campo ${key} en la vista previa`);
    return field;
}

function apply(app, snapshot, fields = snapshot.fields) {
    return app.sendMessage({
        type: "FILLPRO_APPLY_PREVIEW",
        previewId: snapshot.previewId,
        fields: fields.map(({ id, value }) => ({ id, value }))
    });
}

test("previsualizar conserva valores, foco y eventos del formulario", (t) => {
    const app = appFor(t, `<form>
        <input id="first_name" value="Nombre existente">
        <input id="city" autocomplete="address-level2">
        <select name="country"><option value="">Elige</option><option value="CO">Colombia</option></select>
    </form>`);
    const { document, window } = app;
    const input = document.getElementById("first_name");
    input.focus();
    const events = [];
    for (const type of ["focus", "focusin", "input", "change", "blur", "focusout", "submit"]) {
        document.addEventListener(type, (event) => events.push(event.type), true);
    }
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    let writes = 0;
    Object.defineProperty(window.HTMLInputElement.prototype, "value", {
        ...descriptor,
        set(value) { writes += 1; descriptor.set.call(this, value); }
    });

    const snapshot = preview(app, { profile: { first_name: "Ana", country: "Colombia" } });

    assert.equal(fieldFor(snapshot, "firstName").value, "Ana");
    assert.equal(fieldFor(snapshot, "firstName").currentValue, "Nombre existente");
    assert.equal(fieldFor(snapshot, "firstName").selected, false, "datos existentes requieren selección explícita");
    assert.equal(fieldFor(snapshot, "city").value, "", "permite completar datos ausentes del perfil");
    assert.equal(fieldFor(snapshot, "country").selected, true, "una opción placeholder no cuenta como dato del usuario");
    assert.equal(input.value, "Nombre existente");
    assert.equal(document.querySelector("select").selectedIndex, 0);
    assert.equal(document.activeElement, input);
    assert.equal(writes, 0);
    assert.deepEqual(events, []);
});

test("confirmar aplica correcciones seleccionadas sin cambiar el perfil ni enviar el formulario", (t) => {
    const app = appFor(t, `<form><input id="first_name"><input id="last_name">
        <input name="city" value="Bogotá"><button>Enviar</button></form>`);
    const input = app.document.getElementById("first_name");
    const payload = sampleApiResponse();
    const originalPayload = structuredClone(payload);
    const nativeValue = Object.getOwnPropertyDescriptor(app.window.HTMLInputElement.prototype, "value");
    Object.defineProperty(input, "value", {
        get() { return nativeValue.get.call(this); },
        set() { throw new Error("no debe usar el setter de instancia de React"); }
    });
    const events = [];
    for (const type of ["input", "change", "submit"]) {
        app.document.addEventListener(type, (event) => events.push(event.type));
    }

    const snapshot = preview(app, payload);
    const result = apply(app, snapshot, [
        { ...fieldFor(snapshot, "firstName"), value: "Ana María" },
        { ...fieldFor(snapshot, "city"), value: " " }
    ]);

    assert.equal(result.ok, true);
    assert.equal(result.filled, 1);
    assert.deepEqual(plain(result.fields), ["firstName"]);
    assert.equal(input.value, "Ana María");
    assert.equal(app.document.getElementById("last_name").value, "");
    assert.equal(app.document.querySelector("[name=city]").value, "Bogotá");
    assert.deepEqual(events, ["input", "change"]);
    assert.deepEqual(payload, originalPayload);
    assert.equal(apply(app, snapshot).stale, true, "una confirmación no se reutiliza");
});

test("la matriz ampliada conserva fechas, números, correo, habilidades y perfil profesional", (t) => {
    const app = appFor(t, `<form>
        <input id="email" type="email" autocomplete="email">
        <input id="birth_date" type="date" autocomplete="bday">
        <input name="years_experience" type="number" aria-label="Años de experiencia">
        <input name="salary_expectation" type="number" aria-label="Aspiración salarial">
        <input name="graduation_year" type="number" aria-label="Año de graduación">
        <input name="document_number" aria-label="Número de documento">
        <input name="postal_code" autocomplete="postal-code">
        <input name="headline" aria-label="Titular profesional">
        <textarea name="summary" aria-label="Resumen profesional"></textarea>
        <input name="current_company" autocomplete="organization">
        <input name="current_title" autocomplete="organization-title">
        <input name="institution" aria-label="Universidad">
        <input name="field_of_study" aria-label="Área de estudio">
        <textarea name="skills" aria-label="Habilidades"></textarea>
        <input name="languages" aria-label="Idiomas">
        <input name="portfolio" type="url" autocomplete="url">
    </form>`);
    const expected = {
        email: ["email", "juan.perez@correo.com"],
        birthDate: ["date", "1995-05-10"],
        yearsExperience: ["number", "4"],
        salaryExpectation: ["number", "4500000"],
        graduationYear: ["number", "2019"],
        documentNumber: ["text", "1020304050"],
        postalCode: ["text", "050001"],
        headline: ["text", "Desarrollador Full Stack | Node.js · React"],
        summary: ["textarea", "Desarrollador con 4 años de experiencia construyendo APIs y aplicaciones web."],
        currentCompany: ["text", "Acme S.A.S."],
        currentTitle: ["text", "Desarrollador Backend"],
        institution: ["text", "Universidad Nacional de Colombia"],
        fieldOfStudy: ["text", "Ingeniería de Sistemas"],
        skills: ["textarea", "JavaScript, Node.js, SQL"],
        languages: ["text", "Español (nativo), Inglés (B2)"],
        portfolio: ["url", "https://juanperez.dev"]
    };
    const snapshot = preview(app);
    assert.equal(snapshot.fields.length, Object.keys(expected).length);
    for (const [key, [type, value]] of Object.entries(expected)) {
        const field = fieldFor(snapshot, key);
        assert.equal(field.type, type, key);
        assert.equal(field.value, value, key);
        assert.equal(field.currentValue, "", key);
    }
    assert.ok([...app.document.querySelectorAll("input,textarea")].every((element) => element.value === ""));
    const result = apply(app, snapshot, snapshot.fields.map((field) => ({
        ...field,
        value: field.profileKey === "birthDate" ? "1996-06-12"
            : field.profileKey === "yearsExperience" ? "5"
            : field.profileKey === "email" ? "corregido@example.com" : field.value
    })));
    assert.equal(result.ok, true);
    assert.equal(result.filled, 16);
    assert.equal(app.document.getElementById("email").value, "corregido@example.com");
    assert.equal(app.document.getElementById("birth_date").value, "1996-06-12");
    assert.equal(app.document.querySelector("[name=years_experience]").value, "5");
});

test("el correo de cuenta y las habilidades llegan al motor aunque no estén dentro de profile", (t) => {
    const app = appFor(t, `<input type="email" autocomplete="email"><textarea name="skills"></textarea>`);
    const snapshot = preview(app, { profile: {}, accountEmail: "cuenta@example.com", skills: ["SQL", "React"] });
    assert.equal(fieldFor(snapshot, "email").value, "cuenta@example.com");
    assert.equal(fieldFor(snapshot, "skills").value, "SQL, React");
    assert.equal(apply(app, snapshot).filled, 2);
});

for (const [fixture, url, site, count] of [
    ["test-forms/computrabajo-hoja-de-vida.html", "https://co.computrabajo.com/candidato/hoja-de-vida", "Computrabajo", 21],
    ["test-forms/linkedin-easy-apply.html", "https://www.linkedin.com/jobs/view/123", "LinkedIn", 7]
]) {
    test(`preview conserva las reglas y formatos del portal ${site}`, (t) => {
        const app = loadFixture(fixture, { url, includeContentScript: true });
        t.after(() => app.window.close());
        const controls = [...app.document.querySelectorAll("input,textarea,select")];
        const before = controls.map((element) => [element.value, element.selectedIndex, element.checked]);
        const snapshot = preview(app);
        assert.equal(snapshot.site, site);
        const proposed = snapshot.fields.filter((field) => field.value.trim() !== "");
        assert.equal(proposed.length, count);
        assert.equal(fieldFor(snapshot, "phoneNational").value, "3001234567");
        assert.deepEqual(controls.map((element) => [element.value, element.selectedIndex, element.checked]), before);
        assert.equal(apply(app, snapshot, proposed).filled, count);
        assert.equal(app.document.querySelector("input[type=radio]:checked"), null);
    });
}

test("preview y confirmación respetan el ámbito del diálogo de LinkedIn", (t) => {
    const app = appFor(t, `<input id="outside" autocomplete="given-name">
        <div role="dialog" aria-modal="true"><input id="inside" autocomplete="given-name"></div>`,
    { url: "https://www.linkedin.com/jobs/view/123" });
    const snapshot = preview(app);
    assert.equal(snapshot.fields.length, 1);
    assert.equal(apply(app, snapshot).filled, 1);
    assert.equal(app.document.getElementById("inside").value, "Juan Carlos");
    assert.equal(app.document.getElementById("outside").value, "");
});

test("incluye Shadow DOM abierto e iframe del mismo origen sin escribir durante preview", (t) => {
    const app = appFor(t, "<div id='host'></div><iframe id='frame'></iframe>");
    const shadow = app.document.getElementById("host").attachShadow({ mode: "open" });
    shadow.innerHTML = "<input type='email' autocomplete='email'>";
    const frame = app.document.getElementById("frame").contentDocument;
    frame.body.innerHTML = "<input autocomplete='family-name'>";
    const snapshot = preview(app);
    assert.equal(snapshot.fields.length, 2);
    assert.equal(shadow.querySelector("input").value, "");
    assert.equal(frame.querySelector("input").value, "");
    assert.equal(apply(app, snapshot).filled, 2);
    assert.equal(shadow.querySelector("input").value, "juan.perez@correo.com");
    assert.equal(frame.querySelector("input").value, "Pérez Gómez");
});

test("los selects distinguen opciones con el mismo value usando índices", (t) => {
    const app = appFor(t, `<select name="country">
        <option value="">Elige país</option><option value="same">México</option>
        <option value="same">Colombia</option><option value="EC" disabled>Ecuador</option>
        <optgroup label="No disponibles" disabled><option value="PE">Perú</option></optgroup>
    </select>`);
    const select = app.document.querySelector("select");
    const snapshot = preview(app);
    const country = fieldFor(snapshot, "country");
    assert.equal(country.currentValue, "0");
    assert.equal(country.currentLabel, "Elige país");
    assert.equal(country.value, "2");
    assert.deepEqual(plain(country.options), [
        { value: "1", label: "México" }, { value: "2", label: "Colombia" }
    ]);
    assert.equal(select.selectedIndex, 0);
    assert.equal(apply(app, snapshot).filled, 1);
    assert.equal(select.selectedIndex, 2);
    assert.equal(select.value, "same");
    const corrected = preview(app);
    assert.equal(fieldFor(corrected, "country").currentValue, "2");
    assert.equal(fieldFor(corrected, "country").currentLabel, "Colombia");
    assert.equal(apply(app, corrected, [{ ...fieldFor(corrected, "country"), value: "1" }]).filled, 1);
    assert.equal(select.selectedIndex, 1);
});

test("un token de placeholder no puede borrar un select ni permitir escrituras parciales", (t) => {
    const app = appFor(t, `<input name="first_name"><select name="country">
        <option value="">Selecciona país</option><option value="CO" selected>Colombia</option>
    </select>`);
    const snapshot = preview(app);
    const country = fieldFor(snapshot, "country");
    assert.equal(country.currentValue, "1");
    assert.equal(country.currentLabel, "Colombia");
    assert.equal(country.selected, false);
    assert.deepEqual(plain(country.options), [{ value: "1", label: "Colombia" }]);
    const result = apply(app, snapshot, [fieldFor(snapshot, "firstName"), { ...country, value: "0" }]);
    assert.equal(result.ok, false);
    assert.equal(app.document.querySelector("input").value, "");
    assert.equal(app.document.querySelector("select").selectedIndex, 1);
});

test("una regla explícita de portal no anula exclusiones de contraseñas o referencias", (t) => {
    const app = appFor(t, `<form>
        <label for="secret">Password</label><input id="secret" type="text">
        <fieldset><legend>Referencias personales</legend><input id="reference" aria-label="Nombre"></fieldset>
        <input id="candidate" autocomplete="given-name">
    </form>`);
    app.FillPro.siteRegistry.register({
        id: "preview-sensitive-fixture",
        name: "Portal de prueba",
        hostPatterns: [/^empleos\.example\.com$/],
        fieldRules: [{ key: "firstName", selectors: ["#secret", "#reference", "#candidate"] }]
    });
    const snapshot = preview(app);
    assert.equal(snapshot.fields.length, 1);
    assert.equal(snapshot.site, "Portal de prueba");
    assert.equal(apply(app, snapshot).filled, 1);
    assert.equal(app.document.getElementById("candidate").value, "Juan Carlos");
    assert.equal(app.document.getElementById("secret").value, "");
    assert.equal(app.document.getElementById("reference").value, "");
});

test("excluye contraseñas, pagos, códigos, búsquedas y controles no editables", (t) => {
    const app = appFor(t, `<form>
        <input name="first_name" type="password"><input name="first_name" type="hidden">
        <input name="first_name" type="checkbox"><input name="first_name" type="radio">
        <input name="first_name" type="file"><input name="first_name" type="search">
        <input name="first_name" autocomplete="current-password">
        <input name="first_name" autocomplete="new-password">
        <input name="first_name" autocomplete="one-time-code">
        <input name="first_name" autocomplete="cc-number">
        <input name="first_name" disabled><input name="first_name" readonly>
        <input name="first_name" aria-readonly="true"><input name="first_name" aria-disabled="true">
        <fieldset disabled><input name="first_name"></fieldset>
        <div inert><input name="first_name"></div>
        <div style="display:none"><input name="first_name"></div>
        <div aria-hidden="true"><input name="first_name"></div>
        <div role="search"><input name="first_name"></div>
        <select name="country" multiple><option value="CO">Colombia</option></select>
        <fieldset><legend>Contacto de emergencia</legend><input name="first_name"></fieldset>
        <input id="allowed" autocomplete="given-name">
    </form>`);
    const snapshot = preview(app);
    assert.equal(snapshot.fields.length, 1);
    assert.equal(apply(app, snapshot).filled, 1);
    assert.equal(app.document.getElementById("allowed").value, "Juan Carlos");
    for (const input of app.document.querySelectorAll("input:not(#allowed)")) {
        assert.equal(input.type === "checkbox" || input.type === "radio" ? input.checked : input.value,
            input.type === "checkbox" || input.type === "radio" ? false : "");
    }
});

test("un campo modificado invalida toda la selección antes de escribir", (t) => {
    const app = appFor(t, "<input name='first_name'><input name='city'>");
    const snapshot = preview(app);
    app.document.querySelector("[name=city]").value = "Cambio manual";
    const result = apply(app, snapshot);
    assert.equal(result.ok, false);
    assert.equal(result.stale, true);
    assert.equal(app.document.querySelector("[name=first_name]").value, "");
    assert.equal(app.document.querySelector("[name=city]").value, "Cambio manual");
});

for (const [name, change] of [
    ["control desconectado", (input) => input.remove()],
    ["control oculto", (input) => { input.hidden = true; }],
    ["control deshabilitado", (input) => { input.disabled = true; }],
    ["control de solo lectura", (input) => { input.readOnly = true; }],
    ["tipo sensible", (input) => { input.type = "password"; }],
    ["autocomplete sensible", (input) => { input.autocomplete = "current-password"; }],
    ["identidad distinta", (input) => { input.name = "last_name"; }],
    ["formulario distinto", (input, app) => { app.document.getElementById("other").append(input); }],
    ["URL distinta en el mismo documento", (_input, app) => app.window.history.pushState({}, "", "/next")]
]) {
    test(`${name} invalida el snapshot sin escribir`, (t) => {
        const app = appFor(t, "<form><input name='first_name'></form><form id='other'></form>");
        const input = app.document.querySelector("input");
        const snapshot = preview(app);
        change(input, app);
        assert.equal(apply(app, snapshot).stale, true);
        assert.equal(input.value, "");
    });
}

test("una vista previa de otra pestaña/documento no autoriza campos parecidos", (t) => {
    const first = appFor(t, "<input name='first_name'>");
    const second = appFor(t, "<input name='first_name'>");
    const snapshot = preview(first);
    preview(second);
    assert.equal(apply(second, snapshot).stale, true);
    assert.equal(second.document.querySelector("input").value, "");
});

test("nuevo preview invalida el anterior y controles reemplazados no heredan autorización", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    const old = preview(app);
    preview(app);
    assert.equal(apply(app, old).stale, true);
    const current = preview(app);
    app.document.querySelector("input").outerHTML = "<input name='first_name'>";
    assert.equal(apply(app, current).stale, true);
    assert.equal(app.document.querySelector("input").value, "");
});

test("cambiar el root de un campo o sustituir el iframe invalida el snapshot", (t) => {
    const app = appFor(t, "<div id='host'></div><input name='first_name'><iframe></iframe>");
    const shadow = app.document.getElementById("host").attachShadow({ mode: "open" });
    const input = app.document.querySelector("input");
    const initial = preview(app);
    shadow.append(input);
    assert.equal(apply(app, initial).stale, true);
    assert.equal(input.value, "");

    const frame = app.document.querySelector("iframe");
    frame.contentDocument.body.innerHTML = "<input name='city'>";
    const framed = preview(app);
    const city = frame.contentDocument.querySelector("input");
    frame.replaceWith(app.document.createElement("iframe"));
    assert.equal(apply(app, framed).stale, true);
    assert.equal(input.value, "");
    assert.equal(city.value, "");
});

for (const [name, change] of [
    ["texto", (select) => { select.options[1].textContent = "México"; }],
    ["label sin cambiar texto ni valor", (select) => { select.options[1].label = "México"; }],
    ["valor", (select) => { select.options[1].value = "MX"; }],
    ["estado", (select) => { select.options[1].disabled = true; }],
    ["selección", (select) => { select.selectedIndex = 1; }]
]) {
    test(`cambiar ${name} del select invalida la confirmación`, (t) => {
        const app = appFor(t, `<input name="first_name"><select name="country">
            <option value="">Elige</option><option value="CO">Colombia</option></select>`);
        const snapshot = preview(app);
        change(app.document.querySelector("select"));
        assert.equal(apply(app, snapshot).stale, true);
        assert.equal(app.document.querySelector("input").value, "");
    });
}

for (const kind of ["duplicate", "unknown", "non-string"]) {
    test(`selección ${kind} se rechaza sin escribir`, (t) => {
        const app = appFor(t, "<input name='first_name'>");
        const snapshot = preview(app);
        const field = fieldFor(snapshot, "firstName");
        const fields = kind === "duplicate" ? [field, field]
            : kind === "unknown" ? [{ ...field, id: "unknown" }]
            : [{ ...field, value: { text: "Ana" } }];
        assert.equal(apply(app, snapshot, fields).ok, false);
        assert.equal(app.document.querySelector("input").value, "");
    });
}

for (const [kind, attributes, proposed] of [
    ["email", 'type="email" autocomplete="email"', "correo sin arroba"],
    ["date", 'type="date" autocomplete="bday"', "2024-02-31"],
    ["number", 'type="number" name="years_experience" aria-label="Años de experiencia"', "no es un número"],
    ["min/max", 'type="number" name="years_experience" aria-label="Años de experiencia" min="0" max="10"', "50"],
    ["maxlength", 'name="city" maxlength="4"', "Medellín"],
    ["pattern", 'name="postal_code" autocomplete="postal-code" pattern="[0-9]{5}"', "ABCDE"]
]) {
    test(`corrección inválida (${kind}) se rechaza antes de escribir otros campos`, (t) => {
        const app = appFor(t, `<input name="first_name"><input ${attributes}>`);
        const snapshot = preview(app);
        assert.equal(snapshot.fields.length, 2);
        const result = apply(app, snapshot, [snapshot.fields[0], { ...snapshot.fields[1], value: proposed }]);
        assert.equal(result.ok, false);
        assert.ok([...app.document.querySelectorAll("input")].every((element) => element.value === ""));
    });
}

test("los handlers de la página no permiten sobrescribir el siguiente campo modificado", (t) => {
    const app = appFor(t, "<input name='first_name'><input name='city'>");
    const first = app.document.querySelector("[name=first_name]");
    const city = app.document.querySelector("[name=city]");
    const snapshot = preview(app);
    first.addEventListener("input", () => { city.value = "Cambio del portal"; });
    const result = apply(app, snapshot);
    assert.equal(result.ok, false);
    assert.equal(result.stale, true);
    assert.equal(result.filled, 1);
    assert.deepEqual(plain(result.fields), ["firstName"]);
    assert.equal(first.value, "Juan Carlos");
    assert.equal(city.value, "Cambio del portal");
});

test("un handler de focus que cambia el objetivo lo conserva antes del setter nativo", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    const first = app.document.querySelector("input");
    const snapshot = preview(app);
    first.addEventListener("focus", () => { first.value = "Cambio al enfocar"; });
    const result = apply(app, snapshot);
    assert.equal(result.ok, false);
    assert.equal(result.stale, true);
    assert.equal(result.filled, 0);
    assert.deepEqual(plain(result.fields), []);
    assert.equal(first.value, "Cambio al enfocar");
});

test("un fallo parcial durante focus devuelve solo las claves completadas para el historial", (t) => {
    const app = appFor(t, "<input name='first_name'><input name='last_name'><input name='city'>");
    const first = app.document.querySelector("[name=first_name]");
    const last = app.document.querySelector("[name=last_name]");
    const city = app.document.querySelector("[name=city]");
    const snapshot = preview(app);
    first.addEventListener("input", () => { first.value = "Formato impuesto por el portal"; });
    city.addEventListener("focus", () => { city.value = "Cambio al enfocar"; });
    const result = apply(app, snapshot);
    assert.equal(result.ok, false);
    assert.equal(result.stale, true);
    assert.equal(result.filled, 1);
    assert.deepEqual(plain(result.fields), ["lastName"]);
    assert.equal(first.value, "Formato impuesto por el portal");
    assert.equal(last.value, "Pérez Gómez");
    assert.equal(city.value, "Cambio al enfocar");
});

test("un handler de focusin que cambia el siguiente objetivo detiene la escritura antes del setter", (t) => {
    const app = appFor(t, "<input name='first_name'><input name='city'>");
    const first = app.document.querySelector("[name=first_name]");
    const city = app.document.querySelector("[name=city]");
    const snapshot = preview(app);
    first.addEventListener("focusin", () => { city.value = "Actualizado por el portal"; });
    const result = apply(app, snapshot);
    assert.equal(result.ok, false);
    assert.equal(result.stale, true);
    assert.equal(first.value, "");
    assert.equal(city.value, "Actualizado por el portal");
});

test("FILLPRO_AUTOFILL ya no permite saltarse la previsualización y la confirmación", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    const result = app.sendMessage({ type: "FILLPRO_AUTOFILL", ...sampleApiResponse() });
    assert.equal(result.ok, false);
    assert.equal(app.document.querySelector("input").value, "");
});
