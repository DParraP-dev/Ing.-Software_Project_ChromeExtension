/*
 * FillPro — utilidades de presentación compartidas por las páginas.
 * Solo muestran estados (errores por campo, envío, avisos). No hacen
 * peticiones ni guardan datos: esa lógica sigue en cada script de página.
 */
(function (global) {
    "use strict";

    const ICONS = "../assets/icons.svg";

    function icon(name, extraClass = "") {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", ("icon " + extraClass).trim());
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", `${ICONS}#i-${name}`);
        svg.append(use);
        return svg;
    }

    function fieldOf(input) {
        return input.closest(".field");
    }

    /** Muestra un error debajo del campo y lo enlaza con aria-describedby. */
    function setFieldError(input, message) {
        const field = fieldOf(input);
        if (!field) return;

        let error = field.querySelector(".field__error");
        if (!error) {
            error = document.createElement("p");
            error.className = "field__error";
            error.id = `${input.id}-error`;
            error.append(icon("alert-circle"), document.createElement("span"));
            field.append(error);
        }
        error.lastElementChild.textContent = message;
        field.classList.add("field--invalid");
        input.setAttribute("aria-invalid", "true");

        const described = new Set((input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
        described.add(error.id);
        input.setAttribute("aria-describedby", [...described].join(" "));
    }

    function clearFieldError(input) {
        const field = fieldOf(input);
        if (!field) return;
        field.classList.remove("field--invalid");
        input.removeAttribute("aria-invalid");
    }

    /** Valida con las reglas nativas del input (type, required, min, max…) y muestra el mensaje. */
    function validateField(input, messages = {}) {
        const { validity } = input;
        if (validity.valid) {
            clearFieldError(input);
            return true;
        }
        const message = (validity.valueMissing && messages.required)
            || (validity.typeMismatch && messages.type)
            || ((validity.rangeUnderflow || validity.rangeOverflow || validity.stepMismatch) && messages.range)
            || (validity.tooShort && messages.short)
            || messages.fallback
            || input.validationMessage;
        setFieldError(input, message);
        return false;
    }

    /** Valida al salir del campo y limpia el error en cuanto el usuario lo corrige. */
    function liveValidate(input, messages) {
        let touched = false;
        input.addEventListener("blur", () => {
            if (input.value.trim() === "" && !input.required) {
                clearFieldError(input);
                return;
            }
            touched = true;
            validateField(input, messages);
        });
        input.addEventListener("input", () => {
            if (touched || fieldOf(input)?.classList.contains("field--invalid")) {
                if (input.validity.valid) clearFieldError(input);
            }
        });
    }

    /** Estado de envío de un botón: aria-busy + deshabilitado, conservando el texto para lectores. */
    function setBusy(button, busy) {
        if (!button) return;
        button.disabled = busy;
        if (busy) {
            button.setAttribute("aria-busy", "true");
        } else {
            button.removeAttribute("aria-busy");
        }
    }

    let region = null;

    function toastRegion() {
        if (region) return region;
        region = document.createElement("div");
        region.className = "toast-region";
        region.setAttribute("role", "status");
        region.setAttribute("aria-live", "polite");
        document.body.append(region);
        return region;
    }

    /** Aviso breve en la esquina. type: "success" | "error" | "info". */
    function toast(message, type = "info", duration = 4000) {
        const item = document.createElement("div");
        item.className = `toast toast--${type}`;
        const name = type === "success" ? "check-circle" : type === "error" ? "alert-circle" : "info";
        const text = document.createElement("span");
        text.textContent = message;
        item.append(icon(name), text);
        toastRegion().append(item);

        const leave = () => {
            item.dataset.leaving = "";
            setTimeout(() => item.remove(), 220);
        };
        setTimeout(leave, duration);
        return item;
    }

    /** Muestra u oculta una alerta en línea (un elemento .alert existente). */
    function showAlert(element, message, type = "error") {
        if (!element) return;
        element.className = `alert alert--${type}`;
        const text = element.querySelector("[data-alert-text]") || element;
        text.textContent = message;
        element.hidden = !message;
    }

    global.FillProUI = { icon, setFieldError, clearFieldError, validateField, liveValidate, setBusy, toast, showAlert };
})(window);
