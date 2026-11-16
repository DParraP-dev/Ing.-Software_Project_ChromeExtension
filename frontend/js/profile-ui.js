/*
 * FillPro — presentación de la página de perfil.
 *
 * profile.js sigue igual (carga, crea y guarda perfiles). Este script solo:
 *   - valida en línea correo, números y años antes de enviar;
 *   - muestra el progreso, el índice de secciones, el contador del resumen
 *     y las habilidades como chips;
 *   - pone el botón "Guardar perfil" en estado de envío;
 *   - muestra en la página los mensajes que profile.js envía con alert():
 *     los errores del backend ("email no es un correo válido") aparecen debajo
 *     de su campo; "Perfil guardado correctamente" se confirma antes de la
 *     redirección a main.html que ya hace profile.js.
 */
(function () {
    "use strict";

    const UI = window.FillProUI;
    const form = document.getElementById("profileForm");
    const saveButton = document.getElementById("saveProfileButton");
    const alertBox = document.getElementById("profileAlert");
    const saveState = document.getElementById("saveState");
    const saveBarText = document.getElementById("saveBarText");
    if (!form) return;

    const LABELS = {};
    for (const label of form.querySelectorAll("label[for]")) {
        LABELS[label.htmlFor] = label.textContent.trim();
    }

    const MESSAGES = {
        email: { type: "Escribe un correo válido, por ejemplo tu@correo.com." },
        yearsExperience: { range: "Escribe un número entero entre 0 y 70." },
        salaryExpectation: { range: "Escribe solo números, sin puntos ni símbolos." },
        graduationYear: { range: "Escribe un año entre 1950 y 2100." }
    };

    for (const [id, messages] of Object.entries(MESSAGES)) {
        const input = document.getElementById(id);
        if (input) UI.liveValidate(input, { ...messages, fallback: messages.range || messages.type });
    }

    // ── Progreso (mismo cálculo que profile.js guarda en localStorage) ──
    const PROGRESS_IDS = [
        "firstName", "lastName", "email", "phone", "documentType", "documentNumber", "birthDate",
        "country", "state", "city", "address", "postalCode",
        "headline", "summary", "currentTitle", "currentCompany", "yearsExperience", "salaryExpectation",
        "educationLevel", "institution", "fieldOfStudy", "graduationYear", "languages",
        "linkedin", "github", "portfolio", "skills"
    ];
    const bar = document.getElementById("profileProgressBar");
    const barText = document.getElementById("profileProgressText");

    function renderProgress() {
        const filled = PROGRESS_IDS.filter((id) => document.getElementById(id)?.value.trim()).length;
        const percent = Math.round((filled / PROGRESS_IDS.length) * 100);
        bar.setAttribute("aria-valuenow", String(percent));
        bar.firstElementChild.style.setProperty("--value", percent);
        barText.textContent = `${percent}% completo`;
    }

    // ── Habilidades como chips ──
    const skills = document.getElementById("skills");
    const skillsPreview = document.getElementById("skillsPreview");

    function renderSkills() {
        const items = skills.value.split(",").map((s) => s.trim()).filter(Boolean);
        skillsPreview.replaceChildren(...items.map((text) => {
            const li = document.createElement("li");
            li.textContent = text;
            return li;
        }));
    }

    // ── Contador del resumen ──
    function renderCounts() {
        for (const counter of document.querySelectorAll("[data-count-for]")) {
            const input = document.getElementById(counter.dataset.countFor);
            counter.textContent = `${input.value.length} / ${input.maxLength}`;
        }
    }

    // ── Cambios sin guardar ──
    let dirty = false;
    function markDirty(value) {
        dirty = value;
        saveState.textContent = value ? "Cambios sin guardar" : "";
        saveState.dataset.state = value ? "dirty" : "";
        saveBarText.textContent = value
            ? "Tienes cambios sin guardar en este perfil."
            : "Los cambios se guardan en el perfil activo.";
    }

    function renderAll() {
        renderProgress();
        renderSkills();
        renderCounts();
    }

    form.addEventListener("input", () => {
        renderAll();
        markDirty(true);
    });

    // profile.js rellena los campos por código (sin eventos): se refresca la vista
    // cuando termina de cargar o al cambiar de perfil.
    const refresh = () => requestAnimationFrame(() => {
        renderAll();
        markDirty(false);
        for (const input of form.querySelectorAll("[aria-invalid='true']")) UI.clearFieldError(input);
    });
    window.addEventListener("load", () => setTimeout(refresh, 300));
    document.getElementById("profileSelect").addEventListener("change", () => setTimeout(refresh, 400));
    document.getElementById("newProfileButton").addEventListener("click", () => setTimeout(refresh, 600));
    renderAll();

    // ── Índice de secciones: resalta la que está a la vista ──
    const links = [...document.querySelectorAll(".section-nav__link")];
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                for (const link of links) {
                    const current = link.getAttribute("href") === `#${entry.target.id}`;
                    if (current) link.setAttribute("aria-current", "true");
                    else link.removeAttribute("aria-current");
                }
            }
        }, { rootMargin: "-30% 0px -60% 0px" });
        for (const link of links) {
            const section = document.querySelector(link.getAttribute("href"));
            if (section) observer.observe(section);
        }
    }

    // ── Envío ──
    // Este listener se registra antes que el de profile.js. Si hay errores, se detiene el envío.
    form.addEventListener("submit", (event) => {
        UI.showAlert(alertBox, "");
        const invalid = [...form.querySelectorAll("input, select, textarea")]
            .filter((input) => input.value.trim() !== "" && !input.validity.valid);

        for (const input of invalid) {
            const messages = MESSAGES[input.id] || {};
            UI.validateField(input, { ...messages, fallback: messages.range || messages.type });
        }

        if (invalid.length > 0) {
            event.preventDefault();
            event.stopImmediatePropagation();
            UI.showAlert(alertBox, invalid.length === 1
                ? "Revisa el campo marcado antes de guardar."
                : `Revisa los ${invalid.length} campos marcados antes de guardar.`);
            invalid[0].focus();
            return;
        }

        UI.setBusy(saveButton, true);
    });

    // ── Mensajes de profile.js ──
    const nativeAlert = window.alert.bind(window);

    function showBackendErrors(text) {
        // El backend une los errores con ". " y cada uno empieza por la clave del campo.
        const parts = text.split(/\.\s+/).map((part) => part.trim()).filter(Boolean);
        let placed = 0;
        for (const part of parts) {
            const key = part.split(/\s/)[0];
            const input = document.getElementById(key);
            if (input && form.contains(input)) {
                const message = part.slice(key.length).trim();
                UI.setFieldError(input, `${LABELS[key] || key}: ${message}.`);
                placed += 1;
            }
        }
        if (placed > 0) {
            UI.showAlert(alertBox, placed === 1
                ? "No se pudo guardar: revisa el campo marcado."
                : `No se pudo guardar: revisa los ${placed} campos marcados.`);
            form.querySelector("[aria-invalid='true']")?.focus();
        } else {
            UI.showAlert(alertBox, text);
            alertBox.focus();
        }
    }

    window.alert = (message) => {
        const text = String(message ?? "");
        UI.setBusy(saveButton, false);

        if (/^Perfil guardado correctamente/.test(text)) {
            // profile.js redirige a main.html justo después: se confirma en el botón
            // y se mantiene la ventana nativa para que el usuario la lea antes de salir.
            markDirty(false);
            saveButton.textContent = "Guardado";
            UI.toast(text, "success");
            return nativeAlert(text);
        }

        showBackendErrors(text);
        return undefined;
    };
})();
