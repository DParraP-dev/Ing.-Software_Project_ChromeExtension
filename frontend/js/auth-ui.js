/*
 * FillPro — presentación de login / registro / recuperar contraseña.
 *
 * No hace peticiones ni redirige: login.js y signup.js siguen igual.
 * Se encarga de:
 *   - validar en línea (formato de correo, campos vacíos, 8 caracteres, coincidencia);
 *   - mostrar / ocultar la contraseña;
 *   - poner el botón en estado de envío mientras la página espera respuesta;
 *   - mostrar en la alerta de la página los mensajes que login.js/signup.js
 *     envían con alert(), con el mismo texto, en lugar de una ventana del navegador.
 */
(function () {
    "use strict";

    const UI = window.FillProUI;
    const form = document.querySelector("#loginForm, #signupForm, #resetForm");
    if (!form) return;

    const alertBox = document.querySelector("[id$='Alert']");
    const submit = form.querySelector("button[type='submit']");
    const email = form.querySelector("#email");
    const password = form.querySelector("#password");
    const confirm = form.querySelector("#confirmPassword");

    const MESSAGES = {
        email: { required: "Escribe tu correo electrónico.", type: "Escribe un correo válido, por ejemplo tu@correo.com." },
        password: { required: "Escribe tu contraseña.", short: "La contraseña debe tener al menos 8 caracteres." },
        confirm: { required: "Confirma tu contraseña." }
    };

    // ── Mostrar / ocultar contraseña ──
    for (const toggle of form.querySelectorAll("[data-toggle-password]")) {
        const input = document.getElementById(toggle.dataset.togglePassword);
        const use = toggle.querySelector("use");
        toggle.addEventListener("click", () => {
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            toggle.setAttribute("aria-pressed", String(show));
            toggle.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
            use.setAttribute("href", `../assets/icons.svg#i-${show ? "eye-off" : "eye"}`);
        });
    }

    // ── Validación en línea ──
    if (email) UI.liveValidate(email, MESSAGES.email);
    if (password) UI.liveValidate(password, MESSAGES.password);

    function checkConfirm() {
        if (!confirm) return true;
        if (confirm.value === "") {
            UI.setFieldError(confirm, MESSAGES.confirm.required);
            return false;
        }
        if (confirm.value !== password.value) {
            UI.setFieldError(confirm, "Las contraseñas no coinciden.");
            return false;
        }
        UI.clearFieldError(confirm);
        return true;
    }

    if (confirm) {
        confirm.addEventListener("blur", () => confirm.value && checkConfirm());
        confirm.addEventListener("input", () => {
            if (confirm.closest(".field").classList.contains("field--invalid")) checkConfirm();
        });
    }

    // Requisitos de contraseña en el registro
    const lengthRule = document.querySelector("[data-rule='length']");
    if (lengthRule && password) {
        password.addEventListener("input", () => {
            lengthRule.dataset.met = String(password.value.length >= 8);
        });
    }

    // ── Envío ──
    // Se registra antes que el listener de login.js/signup.js (este script carga primero).
    // Si hay errores visibles, se detiene el envío antes de que llegue al servidor.
    form.addEventListener("submit", (event) => {
        UI.showAlert(alertBox, "");
        const checks = [];
        if (email) checks.push(UI.validateField(email, MESSAGES.email));
        if (password) checks.push(UI.validateField(password, MESSAGES.password));
        if (confirm) checks.push(checkConfirm());

        if (checks.includes(false)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            form.querySelector("[aria-invalid='true']")?.focus();
            return;
        }

        UI.setBusy(submit, true);
        // La página puede redirigir o mostrar un mensaje; si no redirige, el botón vuelve.
        clearTimeout(form._busyTimer);
        form._busyTimer = setTimeout(() => UI.setBusy(submit, false), 15000);
    });

    // ── Mensajes de login.js / signup.js en la propia página ──
    const nativeAlert = window.alert.bind(window);
    window.alert = (message) => {
        const text = String(message ?? "");
        clearTimeout(form._busyTimer);
        UI.setBusy(submit, false);
        // El éxito del registro va seguido de una redirección inmediata: se deja la
        // ventana nativa para que el mensaje no se pierda al cambiar de página.
        if (!alertBox || /correctamente/i.test(text)) return nativeAlert(text);
        UI.showAlert(alertBox, text, "error");
        return undefined;
    };
})();
