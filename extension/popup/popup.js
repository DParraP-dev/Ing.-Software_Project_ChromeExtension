const API_BASE_URL = "http://localhost:3000";

const loginPanel = document.getElementById("loginPanel");
const autofillPanel = document.getElementById("autofillPanel");
const previewPanel = document.getElementById("previewPanel");
const loginForm = document.getElementById("loginForm");
const previewForm = document.getElementById("previewForm");
const loginButton = document.getElementById("loginButton");
const autofillButton = document.getElementById("autofillButton");
const clearAutofillButton = document.getElementById("clearAutofillButton");
const logoutButton = document.getElementById("logoutButton");
const confirmButton = document.getElementById("confirmButton");
const cancelPreviewButton = document.getElementById("cancelPreviewButton");
const previewFields = document.getElementById("previewFields");
const previewSummary = document.getElementById("previewSummary");
const statusElement = document.getElementById("status");

let preview = null;
let busy = false;

function setStatus(message = "", type = "info") {
    statusElement.textContent = message;
    statusElement.dataset.type = type;
}

function getSelectedFields() {
    if (!preview) return [];
    return preview.controls
        .filter(({ checkbox, editor }) => checkbox.checked && editor.value.trim() !== "")
        .map(({ field, editor }) => ({ id: field.id, value: editor.value }));
}

function updateSelection() {
    const count = getSelectedFields().length;
    previewSummary.textContent = count === 1
        ? "Se completará 1 campo."
        : `Se completarán ${count} campos.`;
    confirmButton.disabled = busy || count === 0;
}

function setBusy(value) {
    busy = value;
    for (const button of [loginButton, autofillButton, clearAutofillButton, logoutButton, cancelPreviewButton]) {
        button.disabled = value;
    }
    previewFields.disabled = value;
    updateSelection();
}

function discardPreview() {
    preview = null;
    previewFields.replaceChildren();
    previewPanel.classList.add("hidden");
    document.getElementById("previewTarget").textContent = "";
    updateSelection();
}

function showLoggedIn(isLoggedIn) {
    discardPreview();
    loginPanel.classList.toggle("hidden", isLoggedIn);
    autofillPanel.classList.toggle("hidden", !isLoggedIn);
}

async function getStoredToken() {
    const { token } = await chrome.storage.local.get("token");
    return token || null;
}

async function clearSession() {
    await chrome.storage.local.remove("token");
    loginForm.reset();
    showLoggedIn(false);
}

function errorMessage(error) {
    if (/Receiving end does not exist|Could not establish connection|message port closed/i.test(error.message)) {
        return "Recarga la extensión y esta página; luego vuelve a intentarlo.";
    }
    if (error instanceof TypeError) {
        return "No se pudo conectar con FillPro. Comprueba que el backend esté activo.";
    }
    return error.message || "No fue posible completar la operación.";
}

async function requestProfile(token) {
    const response = await fetch(API_BASE_URL + "/profile", {
        headers: { Authorization: "Bearer " + token }
    });

    if (response.status === 401) {
        await clearSession();
        throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
    }
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "No fue posible obtener tu perfil.");
    }
    return data;
}

function renderPreview(result, tab, token) {
    preview = {
        id: result.previewId,
        tabId: tab.id,
        url: tab.url,
        token,
        controls: []
    };
    previewFields.replaceChildren();

    for (const [index, field] of result.fields.entries()) {
        const container = document.createElement("div");
        container.className = "preview-field";
        const heading = document.createElement("div");
        heading.className = "field-heading";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = field.selected !== false;
        checkbox.setAttribute("aria-label", "Incluir " + field.label);

        const label = document.createElement("label");
        label.htmlFor = "preview-value-" + index;
        label.textContent = field.label;

        const editor = document.createElement(field.type === "select" ? "select"
            : field.type === "textarea" ? "textarea" : "input");
        editor.id = label.htmlFor;
        editor.name = "field-" + index;
        // Avoid the browser's own autofill replacing the reviewed suggestions.
        editor.autocomplete = "off";
        if (field.type === "select") {
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Omitir este campo";
            editor.append(placeholder);
            for (const option of field.options || []) {
                if (!option.value) continue;
                const element = document.createElement("option");
                element.value = option.value;
                element.textContent = option.label;
                editor.append(element);
            }
        } else if (field.type !== "textarea") {
            editor.type = field.type === "tel" ? "tel" : "text";
            if (field.type === "url") editor.inputMode = "url";
        }
        editor.value = field.value;
        editor.disabled = !checkbox.checked;

        const current = document.createElement("p");
        current.className = "current-value";
        current.id = "preview-current-" + index;
        const currentText = field.currentLabel
            ?? field.options?.find((option) => option.value === field.currentValue)?.label
            ?? field.currentValue;
        current.textContent = currentText ? "Valor actual: " + currentText : "Campo actualmente vacío";
        editor.setAttribute("aria-describedby", current.id);

        checkbox.addEventListener("change", () => {
            editor.disabled = !checkbox.checked;
            updateSelection();
        });
        editor.addEventListener("input", updateSelection);
        editor.addEventListener("change", updateSelection);
        heading.append(checkbox, label);
        container.append(heading, editor, current);
        previewFields.append(container);
        preview.controls.push({ field, checkbox, editor });
    }

    document.getElementById("previewTarget").textContent =
        result.fields.length + " campos detectados en " + new URL(tab.url).host;
    autofillPanel.classList.add("hidden");
    previewPanel.classList.remove("hidden");
    updateSelection();
    document.getElementById("previewTitle").focus();
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("Conectando con FillPro...");

    try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const response = await fetch(API_BASE_URL + "/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "No fue posible iniciar sesión.");
        }
        if (typeof data.token !== "string" || !data.token) {
            throw new Error("El servidor no devolvió una sesión válida.");
        }
        await chrome.storage.local.set({ token: data.token });
        loginForm.reset();
        showLoggedIn(true);
        setStatus("Sesión iniciada. Ya puedes previsualizar los datos.", "success");
    } catch (error) {
        setStatus(errorMessage(error), "error");
    } finally {
        setBusy(false);
    }
});

autofillButton.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    discardPreview();
    setStatus("Preparando la vista previa...");

    try {
        const token = await getStoredToken();
        if (!token) {
            showLoggedIn(false);
            throw new Error("Inicia sesión para usar el autocompletado.");
        }
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab?.id || !/^https?:\/\//i.test(activeTab.url || "")) {
            throw new Error("Abre una página web con un formulario para previsualizar.");
        }
        const { profile, skills, accountEmail } = await requestProfile(token);
        if (!profile) {
            throw new Error("Completa y guarda tu perfil en FillPro antes de previsualizar.");
        }
        const result = await chrome.tabs.sendMessage(activeTab.id, {
            type: "FILLPRO_PREVIEW", profile, skills, accountEmail
        }, { frameId: 0 });
        if (!result?.ok || !result.previewId || !Array.isArray(result.fields)) {
            throw new Error(result?.error || "No fue posible preparar la vista previa.");
        }
        if (result.fields.length === 0) {
            throw new Error("No se encontraron campos compatibles y editables en esta página.");
        }
        renderPreview(result, activeTab, token);
        setStatus();
    } catch (error) {
        setStatus(errorMessage(error), "error");
    } finally {
        setBusy(false);
    }
});

clearAutofillButton.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    discardPreview();
    setStatus("Borrando los campos autocompletados...");

    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab?.id || !/^https?:\/\//i.test(activeTab.url || "")) {
            throw new Error("Abre una página web con un formulario para borrar el autocompletado.");
        }
        // Clearing belongs to this page: it needs neither a profile request nor a database update.
        const result = await chrome.tabs.sendMessage(activeTab.id, {
            type: "FILLPRO_CLEAR_AUTOFILL"
        }, { frameId: 0 });
        if (!result?.ok || !Number.isInteger(result.cleared) || result.cleared < 0
            || !Number.isInteger(result.skipped) || result.skipped < 0) {
            throw new Error(result?.error || "No fue posible borrar el autocompletado. Recarga la extensión y esta página.");
        }
        let message = result.cleared === 0
            ? result.skipped > 0 ? "No se borraron campos." : "No hay campos autocompletados por FillPro para borrar en esta página."
            : result.cleared === 1 ? "Se borró 1 campo autocompletado."
                : `Se borraron ${result.cleared} campos autocompletados.`;
        if (result.skipped > 0) {
            message += result.skipped === 1
                ? " Se conservó 1 campo modificado o no disponible."
                : ` Se conservaron ${result.skipped} campos modificados o no disponibles.`;
        }
        setStatus(message, result.cleared > 0 ? "success" : "info");
    } catch (error) {
        setStatus(errorMessage(error), "error");
    } finally {
        setBusy(false);
    }
});

previewForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !preview) return;
    const selectedFields = getSelectedFields();
    if (selectedFields.length === 0) return;
    const draft = preview;
    setBusy(true);
    setStatus("Aplicando los valores revisados...");

    try {
        const token = await getStoredToken();
        if (!token || token !== draft.token) {
            showLoggedIn(Boolean(token));
            throw new Error("La sesión cambió. Vuelve a previsualizar los datos.");
        }
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id !== draft.tabId || activeTab.url !== draft.url) {
            throw new Error("La pestaña cambió. Vuelve a previsualizar el formulario.");
        }
        const result = await chrome.tabs.sendMessage(draft.tabId, {
            type: "FILLPRO_APPLY_PREVIEW",
            previewId: draft.id,
            fields: selectedFields
        }, { frameId: 0 });
        if (!result?.ok) {
            throw new Error(result?.error || "La página no respondió. Vuelve a previsualizar.");
        }
        showLoggedIn(true);
        let message = result.filled === 0
            ? result.skipped > 0 ? "No se completaron campos." : "Los campos seleccionados ya tenían esos valores."
            : result.filled === 1
                ? "Se completó 1 campo. Revisa el formulario antes de enviarlo."
                : "Se completaron " + result.filled + " campos. Revisa el formulario antes de enviarlo.";
        if (result.skipped > 0) {
            message += ` La página no aceptó los valores de ${result.skipped} campo(s). Revisa el formulario.`;
        }
        setStatus(message, result.skipped > 0 ? "info" : "success");
    } catch (error) {
        // A failed message may have reached the page. Require a new snapshot before retrying.
        discardPreview();
        if (loginPanel.classList.contains("hidden")) autofillPanel.classList.remove("hidden");
        setStatus(errorMessage(error), "error");
    } finally {
        setBusy(false);
    }
});

cancelPreviewButton.addEventListener("click", () => {
    if (busy) return;
    showLoggedIn(true);
    setStatus("Vista previa cancelada. El formulario sigue igual.");
    autofillButton.focus();
});

logoutButton.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    try {
        await clearSession();
        setStatus("Sesión cerrada.");
    } catch (error) {
        setStatus(errorMessage(error), "error");
    } finally {
        setBusy(false);
    }
});

setBusy(true);
getStoredToken()
    .then((token) => showLoggedIn(Boolean(token)))
    .catch(() => {
        showLoggedIn(false);
        setStatus("No fue posible leer la sesión guardada.", "error");
    })
    .finally(() => setBusy(false));
