/** Borra únicamente escrituras atribuidas a FillPro que continúan intactas. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadExtension, sampleApiResponse, plain } = require("./helpers/loadExtension");

function appFor(t, html, options = {}) {
    const app = loadExtension(html, { ...options, includeContentScript: true });
    t.after(() => app.window.close());
    return app;
}

function preview(app, payload = sampleApiResponse()) {
    const snapshot = app.sendMessage({ type: "FILLPRO_PREVIEW", ...payload });
    assert.equal(snapshot?.ok, true);
    return snapshot;
}

function apply(app, snapshot, selected = snapshot.fields) {
    return app.sendMessage({
        type: "FILLPRO_APPLY_PREVIEW",
        previewId: snapshot.previewId,
        fields: selected.map(({ id, value }) => ({ id, value }))
    });
}

function fill(app, payload = sampleApiResponse(), choose = (fields) => fields) {
    const snapshot = preview(app, payload);
    const result = apply(app, snapshot, choose(snapshot.fields));
    assert.equal(result.ok, true);
    return result;
}

function clear(app) {
    return plain(app.sendMessage({ type: "FILLPRO_CLEAR_AUTOFILL" }));
}

test("borrar elimina solo escrituras reales de FillPro y conserva campos omitidos o ya coincidentes", (t) => {
    const app = appFor(t, `<form>
        <input name="first_name" value="Nombre anterior">
        <input name="last_name" value="Pérez Gómez">
        <input name="city" value="Bogotá">
        <textarea name="comments">Comentarios propios</textarea>
        <button>Enviar</button>
    </form>`);
    const input = app.document.querySelector("[name=first_name]");
    const descriptor = Object.getOwnPropertyDescriptor(app.window.HTMLInputElement.prototype, "value");
    Object.defineProperty(input, "value", {
        get() { return descriptor.get.call(this); },
        set() { throw new Error("debe utilizar el setter nativo, no el de React"); }
    });
    fill(app, sampleApiResponse(), (fields) => fields.filter((field) => field.profileKey !== "city"));
    const events = [];
    for (const type of ["focus", "focusin", "input", "change", "blur", "focusout", "submit"]) {
        app.document.addEventListener(type, (event) => events.push(event.type), true);
    }

    assert.deepEqual(clear(app), { ok: true, cleared: 1, skipped: 0 });
    assert.equal(input.value, "");
    assert.equal(app.document.querySelector("[name=last_name]").value, "Pérez Gómez");
    assert.equal(app.document.querySelector("[name=city]").value, "Bogotá");
    assert.equal(app.document.querySelector("textarea").value, "Comentarios propios");
    assert.deepEqual(events, ["focus", "focusin", "input", "change", "blur", "focusout"]);
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 0 });
});

test("previsualizar, confirmar sin cambios o no confirmar no crea escrituras para borrar", (t) => {
    const app = appFor(t, "<input name='first_name' value='Juan Carlos'>");
    preview(app);
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 0 });
    assert.equal(fill(app).filled, 0);
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 0 });
    assert.equal(app.document.querySelector("input").value, "Juan Carlos");
});

test("borrar invalida cualquier preview pendiente aunque todavía no haya escrituras", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    const snapshot = preview(app);
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 0 });
    assert.equal(apply(app, snapshot).stale, true);
    assert.equal(app.document.querySelector("input").value, "");
});

test("acumula controles de varias confirmaciones y conserva la última escritura de cada uno", (t) => {
    const app = appFor(t, "<input name='first_name'><input name='city'>");
    fill(app, sampleApiResponse(), (fields) => fields.filter((field) => field.profileKey === "firstName"));
    const payload = sampleApiResponse();
    payload.profile.first_name = "Ana María";
    fill(app, payload);
    assert.equal(app.document.querySelector("[name=first_name]").value, "Ana María");
    assert.deepEqual(clear(app), { ok: true, cleared: 2, skipped: 0 });
    assert.ok([...app.document.querySelectorAll("input")].every((input) => input.value === ""));
});

test("una confirmación repetida sin cambios mantiene la atribución de la primera escritura", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    assert.equal(fill(app).filled, 1);
    assert.equal(fill(app).filled, 0);
    assert.deepEqual(clear(app), { ok: true, cleared: 1, skipped: 0 });
});

test("una edición posterior se preserva y su registro se consume aunque después coincida otra vez", (t) => {
    const app = appFor(t, "<input name='first_name'><input name='city'>");
    fill(app);
    const first = app.document.querySelector("[name=first_name]");
    first.value = "Edición manual";
    assert.deepEqual(clear(app), { ok: true, cleared: 1, skipped: 1 });
    assert.equal(first.value, "Edición manual");
    first.value = "Juan Carlos";
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 0 });
    assert.equal(first.value, "Juan Carlos");
});

test("una nueva corrección confirmada tras editar manualmente vuelve a ser borrable", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    fill(app);
    const input = app.document.querySelector("input");
    input.value = "Edición propia";
    const snapshot = preview(app);
    assert.equal(apply(app, snapshot, [{ ...snapshot.fields[0], value: "Corrección aprobada" }]).filled, 1);
    assert.deepEqual(clear(app), { ok: true, cleared: 1, skipped: 0 });
    assert.equal(input.value, "");
});

test("borrar respeta correos, números, fechas, textareas y no modifica el objeto de perfil", (t) => {
    const app = appFor(t, `<input type="email" autocomplete="email">
        <input type="date" autocomplete="bday">
        <input type="number" name="years_experience" aria-label="Años de experiencia">
        <textarea name="skills"></textarea><input name="github" type="url">`);
    const payload = sampleApiResponse();
    const original = structuredClone(payload);
    assert.equal(fill(app, payload).filled, 5);
    assert.deepEqual(clear(app), { ok: true, cleared: 5, skipped: 0 });
    assert.ok([...app.document.querySelectorAll("input,textarea")].every((element) => element.value === ""));
    assert.deepEqual(payload, original);
});

test("borra en Shadow DOM abierto y usa los setters de la ventana del iframe", (t) => {
    const app = appFor(t, "<div id='host'></div><iframe></iframe>");
    const shadow = app.document.getElementById("host").attachShadow({ mode: "open" });
    shadow.innerHTML = "<input autocomplete='given-name'>";
    const frameDocument = app.document.querySelector("iframe").contentDocument;
    frameDocument.body.innerHTML = "<input type='email' autocomplete='email'>";
    assert.equal(fill(app).filled, 2);
    assert.deepEqual(clear(app), { ok: true, cleared: 2, skipped: 0 });
    assert.equal(shadow.querySelector("input").value, "");
    assert.equal(frameDocument.querySelector("input").value, "");
});

test("los selects quedan sin selección incluso con placeholder vacío y values duplicados", (t) => {
    const app = appFor(t, `<select name="country">
        <option value="">Elige</option><option value="same">México</option><option value="same">Colombia</option>
    </select>`);
    const select = app.document.querySelector("select");
    fill(app);
    assert.equal(select.selectedIndex, 2);
    assert.deepEqual(clear(app), { ok: true, cleared: 1, skipped: 0 });
    assert.equal(select.selectedIndex, -1);
    assert.equal(select.value, "");
    assert.ok([...select.options].every((option) => !option.selected));
});

test("cambiar a otra opción con el mismo value se considera una edición posterior", (t) => {
    const app = appFor(t, `<select name="country">
        <option value="">Elige</option><option value="same">México</option><option value="same">Colombia</option>
    </select>`);
    const select = app.document.querySelector("select");
    fill(app);
    select.selectedIndex = 1;
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 1 });
    assert.equal(select.selectedIndex, 1);
});

for (const [name, change] of [
    ["control desconectado", (input) => input.remove()],
    ["control deshabilitado", (input) => { input.disabled = true; }],
    ["control oculto", (input) => { input.hidden = true; }],
    ["control de solo lectura", (input) => { input.readOnly = true; }],
    ["tipo sensible", (input) => { input.type = "password"; }],
    ["autocomplete sensible", (input) => { input.autocomplete = "current-password"; }],
    ["identidad distinta", (input) => { input.name = "last_name"; }],
    ["formulario distinto", (input, app) => app.document.getElementById("other").append(input)],
    ["navegación", (_input, app) => app.window.history.pushState({}, "", "/next")]
]) {
    test(`borrar conserva ${name} y consume su registro`, (t) => {
        const app = appFor(t, "<form><input name='first_name'></form><form id='other'></form>");
        const input = app.document.querySelector("input");
        fill(app);
        change(input, app);
        assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 1 });
        assert.equal(input.value, "Juan Carlos");
        assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 0 });
    });
}

test("no borra un reemplazo con la misma identidad y el mismo valor", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    fill(app);
    app.document.querySelector("input").outerHTML = "<input name='first_name' value='Juan Carlos'>";
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 1 });
    assert.equal(app.document.querySelector("input").value, "Juan Carlos");
});

test("una pestaña nueva con campos idénticos no hereda el historial de borrado", (t) => {
    const first = appFor(t, "<input name='first_name'>");
    fill(first);
    const second = appFor(t, "<input name='first_name' value='Juan Carlos'>");
    assert.deepEqual(clear(second), { ok: true, cleared: 0, skipped: 0 });
    assert.equal(second.document.querySelector("input").value, "Juan Carlos");
    assert.deepEqual(clear(first), { ok: true, cleared: 1, skipped: 0 });
});

test("cambiar el shadow root o reemplazar el iframe conserva los campos anteriores", (t) => {
    const app = appFor(t, "<div id='host'></div><input name='first_name'><iframe></iframe>");
    const first = app.document.querySelector("input");
    const frame = app.document.querySelector("iframe");
    frame.contentDocument.body.innerHTML = "<input name='city'>";
    const city = frame.contentDocument.querySelector("input");
    fill(app);
    app.document.getElementById("host").attachShadow({ mode: "open" }).append(first);
    frame.replaceWith(app.document.createElement("iframe"));
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 2 });
    assert.equal(first.value, "Juan Carlos");
    assert.equal(city.value, "Medellín");
});

test("el control que sale del diálogo del portal queda fuera del borrado", (t) => {
    const app = appFor(t, `<div role="dialog" aria-modal="true">
        <input autocomplete="given-name"><span id="inside"></span>
    </div><div id="outside"></div>`, { url: "https://www.linkedin.com/jobs/view/123" });
    const input = app.document.querySelector("input");
    fill(app);
    app.document.getElementById("outside").append(input);
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 1 });
    assert.equal(input.value, "Juan Carlos");
});

test("cambiar opciones del select conserva la selección aunque su índice siga igual", (t) => {
    const app = appFor(t, `<select name="country"><option value="">Elige</option>
        <option value="CO">Colombia</option></select>`);
    fill(app);
    const select = app.document.querySelector("select");
    select.options[1].textContent = "México";
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 1 });
    assert.equal(select.selectedIndex, 1);
});

test("los handlers durante autocompletado no convierten modificaciones de la página en datos borrables", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    const input = app.document.querySelector("input");
    input.addEventListener("input", () => { input.value = "Formato impuesto por el portal"; });
    const result = fill(app);
    assert.equal(result.filled, 0);
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 1 });
    assert.equal(input.value, "Formato impuesto por el portal");
});

test("si la confirmación se interrumpe, borrar cubre solo las escrituras ya realizadas", (t) => {
    const app = appFor(t, "<input name='first_name'><input name='city'>");
    const first = app.document.querySelector("[name=first_name]");
    const city = app.document.querySelector("[name=city]");
    const snapshot = preview(app);
    first.addEventListener("input", () => { city.value = "Actualizado por la página"; }, { once: true });
    const result = apply(app, snapshot);
    assert.equal(result.stale, true);
    assert.equal(result.filled, 1);
    assert.deepEqual(clear(app), { ok: true, cleared: 1, skipped: 0 });
    assert.equal(first.value, "");
    assert.equal(city.value, "Actualizado por la página");
});

test("un handler de focus al borrar no permite borrar una edición del mismo objetivo", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    const input = app.document.querySelector("input");
    fill(app);
    input.addEventListener("focus", () => { input.value = "Cambio al enfocar"; });
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 1 });
    assert.equal(input.value, "Cambio al enfocar");
});

test("un handler al borrar un campo no permite borrar la edición del siguiente", (t) => {
    const app = appFor(t, "<input name='first_name'><input name='city'>");
    const first = app.document.querySelector("[name=first_name]");
    const city = app.document.querySelector("[name=city]");
    fill(app);
    first.addEventListener("input", () => { city.value = "Cambio durante el borrado"; });
    assert.deepEqual(clear(app), { ok: true, cleared: 1, skipped: 1 });
    assert.equal(first.value, "");
    assert.equal(city.value, "Cambio durante el borrado");
});

test("si la página repuebla el mismo campo se informa omitido y se conserva su valor", (t) => {
    const app = appFor(t, "<input name='first_name'>");
    const input = app.document.querySelector("input");
    fill(app);
    input.addEventListener("input", () => { input.value = "Valor predeterminado"; });
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 1 });
    assert.equal(input.value, "Valor predeterminado");
});

test("si un handler posterior repuebla un campo anterior el conteo refleja el estado final", (t) => {
    const app = appFor(t, "<input name='first_name'><input name='city'>");
    const first = app.document.querySelector("[name=first_name]");
    const city = app.document.querySelector("[name=city]");
    fill(app);
    city.addEventListener("input", () => { first.value = "Valor nuevo de la página"; });
    assert.deepEqual(clear(app), { ok: true, cleared: 1, skipped: 1 });
    assert.equal(first.value, "Valor nuevo de la página");
    assert.equal(city.value, "");
});

test("un select repoblado por la página después de borrar no cuenta como vacío", (t) => {
    const app = appFor(t, `<select name="country"><option value="">Elige</option>
        <option value="CO">Colombia</option></select>`);
    const select = app.document.querySelector("select");
    fill(app);
    select.addEventListener("input", () => { select.selectedIndex = 0; });
    assert.deepEqual(clear(app), { ok: true, cleared: 0, skipped: 1 });
    assert.equal(select.selectedIndex, 0);
});
