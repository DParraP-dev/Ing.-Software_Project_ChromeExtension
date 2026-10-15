/**
 * Escribe valores en los controles de forma compatible con los frameworks
 * que usan los portales (React en LinkedIn, Angular/Vue en otros ATS):
 *
 *  1. Usa el setter nativo de `value` del prototipo (HTMLInputElement, etc.)
 *     de la ventana dueña del elemento (sirve también dentro de iframes).
 *     Así React detecta el cambio en su "value tracker".
 *  2. Dispara la misma secuencia que un usuario: focus → input → change → blur,
 *     con burbujeo, para que validaciones y estados "touched" se actualicen.
 *  3. No llama a element.focus(): no roba el foco ni desplaza la página.
 *  4. No sobrescribe lo que el usuario (o el portal) ya escribió, salvo que
 *     se pida explícitamente con `overwrite`.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    function windowOf(element) {
        return element.ownerDocument?.defaultView || global;
    }

    function prototypeFor(element) {
        const view = windowOf(element);
        switch (element.tagName) {
            case "TEXTAREA":
                return view.HTMLTextAreaElement?.prototype;
            case "SELECT":
                return view.HTMLSelectElement?.prototype;
            default:
                return view.HTMLInputElement?.prototype;
        }
    }

    function setNativeValue(element, value) {
        const prototype = prototypeFor(element);
        const setter = prototype && Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (setter) {
            setter.call(element, value);
        } else {
            element.value = value;
        }
    }

    function setNativeSelectedIndex(element, index) {
        const prototype = prototypeFor(element);
        const setter = prototype && Object.getOwnPropertyDescriptor(prototype, "selectedIndex")?.set;
        if (setter) {
            setter.call(element, index);
        } else {
            element.selectedIndex = index;
        }
    }

    function dispatch(element, type, init = {}) {
        const view = windowOf(element);
        let event;
        if ((type === "focus" || type === "blur" || type === "focusin" || type === "focusout") && view.FocusEvent) {
            event = new view.FocusEvent(type, { bubbles: type === "focusin" || type === "focusout", ...init });
        } else if (type === "input" && view.InputEvent) {
            event = new view.InputEvent(type, { bubbles: true, cancelable: false, inputType: "insertText", ...init });
        } else {
            event = new (view.Event || Event)(type, { bubbles: true, ...init });
        }
        element.dispatchEvent(event);
    }

    function withUserLikeEvents(element, write, data, beforeWrite, afterWrite) {
        dispatch(element, "focus");
        dispatch(element, "focusin");
        // A portal may change its form in focus handlers; reviewed writes revalidate here.
        if (beforeWrite && !beforeWrite()) {
            return false;
        }
        write();
        // Observe the native write before a portal's input/change handlers transform it.
        if (afterWrite) afterWrite();
        dispatch(element, "input", data !== undefined ? { data } : {});
        dispatch(element, "change");
        dispatch(element, "blur");
        dispatch(element, "focusout");
        return true;
    }

    /** ¿El control ya tiene un valor elegido por el usuario o el portal? */
    function hasUserValue(element) {
        if (element.tagName === "SELECT") {
            const option = element.options[element.selectedIndex];
            if (!option) {
                return false;
            }
            return !FillPro.valueFormatter.isPlaceholderOption({
                value: option.value,
                text: option.textContent,
                disabled: option.disabled,
                index: element.selectedIndex
            });
        }
        return String(element.value ?? "").trim() !== "";
    }

    /**
     * @returns {"filled"|"skipped"|"unchanged"}
     */
    function fillText(element, value, { overwrite = false, beforeWrite, afterWrite } = {}) {
        if (String(element.value) === value) {
            return "unchanged";
        }
        if (!overwrite && hasUserValue(element)) {
            return "skipped";
        }

        if (!withUserLikeEvents(element, () => setNativeValue(element, value), value, beforeWrite, afterWrite)) {
            return "skipped";
        }

        // Algunos inputs (máscaras, type=number) rechazan el valor: no se reporta como completado.
        return String(element.value) === value ? "filled" : "skipped";
    }

    /**
     * @returns {"filled"|"skipped"|"unchanged"}
     */
    function fillSelect(element, optionIndex, { overwrite = false, beforeWrite, afterWrite } = {}) {
        if (optionIndex < 0 || optionIndex >= element.options.length) {
            return "skipped";
        }
        if (element.selectedIndex === optionIndex) {
            return "unchanged";
        }
        if (!overwrite && hasUserValue(element)) {
            return "skipped";
        }

        const option = element.options[optionIndex];
        const written = withUserLikeEvents(element, () => {
            setNativeValue(element, option.value);
            if (element.selectedIndex !== optionIndex) {
                setNativeSelectedIndex(element, optionIndex); // valores duplicados entre opciones
            }
        }, undefined, beforeWrite, afterWrite);
        if (!written) {
            return "skipped";
        }
        return element.selectedIndex === optionIndex ? "filled" : "skipped";
    }

    /** Vacía el control sin seleccionar un placeholder ni enviar el formulario. */
    function clearField(element, { beforeWrite, afterWrite } = {}) {
        const isEmpty = () => element.tagName === "SELECT"
            ? element.selectedIndex === -1 : element.value === "";
        if (isEmpty()) return "unchanged";
        const written = withUserLikeEvents(element, () => {
            if (element.tagName === "SELECT") setNativeSelectedIndex(element, -1);
            else setNativeValue(element, "");
        }, "", beforeWrite, afterWrite);
        return written && isEmpty() ? "cleared" : "skipped";
    }

    /** Opciones del select en formato plano para FillPro.valueFormatter. */
    function readOptions(select) {
        return Array.from(select.options, (option, index) => ({
            value: option.value,
            text: option.textContent || option.label || "",
            label: option.label || option.textContent || "",
            disabled: option.disabled,
            index
        }));
    }

    FillPro.fieldFiller = { fillText, fillSelect, clearField, readOptions, hasUserValue, setNativeValue };
})(globalThis);
