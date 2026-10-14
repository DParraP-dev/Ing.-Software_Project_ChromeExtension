/**
 * Extrae de un control del DOM toda la evidencia textual disponible y la
 * entrega como un objeto plano (descriptor) que entiende FillPro.fieldMatcher:
 *
 *   label        <label for>, <label> envolvente, aria-labelledby
 *   ariaLabel    aria-label, title
 *   attributes   name, id, data-automation-id, data-testid, formcontrolname...
 *   placeholder  placeholder
 *   nearbyLabel  texto del contenedor que envuelve SOLO a este control
 *                (formularios React/Angular sin <label for>) o el hermano anterior
 *   section      <legend>, aria-label del grupo o encabezado previo
 *                (solo para descartar secciones de referencias/emergencia)
 *
 * Solo lee el DOM; nunca lo modifica.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    const ATTRIBUTE_NAMES = [
        "name", "id", "data-automation-id", "data-testid", "data-test-id", "data-test",
        "data-qa", "data-field", "data-name", "formcontrolname", "ng-model"
    ];
    const TEXT_INPUT_TYPES = new Set(["", "text"]);
    const SUPPORTED_INPUT_TYPES = new Set(["email", "tel", "url", "number", "date"]);
    const CONTROL_SELECTOR = "input, select, textarea";
    const SKIPPED_TEXT_PARENTS = new Set(["SELECT", "OPTION", "TEXTAREA", "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "BUTTON"]);
    const MAX_TEXT = 160;
    const MAX_ANCESTORS = 4;
    const MAX_SIBLINGS = 12;

    /** Tipo lógico del control o null si FillPro no debe tocarlo. */
    function getKind(element) {
        const tag = element.tagName;
        if (tag === "SELECT") {
            return element.multiple ? null : "select";
        }
        if (tag === "TEXTAREA") {
            return "textarea";
        }
        if (tag !== "INPUT") {
            return null;
        }

        const type = (element.getAttribute("type") || "").toLowerCase();
        if (TEXT_INPUT_TYPES.has(type)) {
            return "text";
        }
        return SUPPORTED_INPUT_TYPES.has(type) ? type : null;
    }

    /** Texto visible de un nodo, ignorando opciones de <select>, scripts y botones. */
    function textOf(node) {
        if (!node) {
            return "";
        }

        const doc = node.ownerDocument || node;
        const view = doc.defaultView || global;
        const walker = doc.createTreeWalker(node, view.NodeFilter ? view.NodeFilter.SHOW_TEXT : 4);
        const parts = [];
        let length = 0;

        while (walker.nextNode() && length < MAX_TEXT * 2) {
            const textNode = walker.currentNode;
            let parent = textNode.parentElement;
            let skip = false;
            while (parent && parent !== node) {
                if (SKIPPED_TEXT_PARENTS.has(parent.tagName)) {
                    skip = true;
                    break;
                }
                parent = parent.parentElement;
            }
            if (!skip) {
                const value = textNode.nodeValue.trim();
                if (value) {
                    parts.push(value);
                    length += value.length;
                }
            }
        }

        return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
    }

    /** Padre "compuesto": cruza el límite de un shadow root hacia su host. */
    function parentOf(node) {
        if (node.parentElement) {
            return node.parentElement;
        }
        const parent = node.parentNode;
        return parent && parent.nodeType === 11 && parent.host ? parent.host : null;
    }

    function lookupById(element, id) {
        const root = element.getRootNode ? element.getRootNode() : element.ownerDocument;
        return (root.getElementById && root.getElementById(id))
            || element.ownerDocument.getElementById(id);
    }

    function getLabels(element) {
        const texts = [];

        if (element.labels) {
            for (const label of Array.from(element.labels)) {
                texts.push(textOf(label));
            }
        }

        const labelledBy = element.getAttribute("aria-labelledby");
        if (labelledBy) {
            const text = labelledBy.split(/\s+/)
                .map((id) => textOf(lookupById(element, id)))
                .filter(Boolean)
                .join(" ");
            texts.push(text);
        }

        return texts.filter(Boolean);
    }

    function getAttributes(element) {
        return ATTRIBUTE_NAMES
            .map((name) => element.getAttribute(name))
            .filter(Boolean);
    }

    function countControls(container) {
        return container.querySelectorAll(CONTROL_SELECTOR).length;
    }

    /**
     * Texto del contenedor más cercano que envuelve únicamente a este control.
     * Cubre <div><span>Teléfono</span><input></div> y estructuras similares.
     */
    function getNearbyLabel(element) {
        const texts = [];
        let current = element;

        for (let level = 0; level < MAX_ANCESTORS; level += 1) {
            const parent = parentOf(current);
            if (!parent || parent.tagName === "FORM" || parent.tagName === "BODY") {
                break;
            }
            if (countControls(parent) > 1) {
                break;
            }
            const text = textOf(parent);
            if (text) {
                texts.push(text);
                break;
            }
            current = parent;
        }

        if (texts.length === 0) {
            const previous = element.previousElementSibling;
            if (previous && countControls(previous) === 0 && previous.tagName !== "LABEL") {
                const text = textOf(previous);
                if (text) {
                    texts.push(text);
                }
            }
        }

        return texts;
    }

    function isHeading(node) {
        return /^H[1-6]$/.test(node.tagName) || node.getAttribute("role") === "heading";
    }

    /** Contexto de sección: legend, aria-label del grupo o encabezado anterior. */
    function getSection(element) {
        const texts = [];

        const fieldset = element.closest("fieldset");
        const legend = fieldset && fieldset.querySelector(":scope > legend");
        if (legend) {
            texts.push(textOf(legend));
        }

        const group = element.closest("[role='group'][aria-label], [role='region'][aria-label], section[aria-label]");
        if (group) {
            texts.push(group.getAttribute("aria-label"));
        }

        let current = element;
        let found = null;
        for (let level = 0; level < 6 && current && !found; level += 1) {
            let sibling = current.previousElementSibling;
            for (let steps = 0; sibling && steps < MAX_SIBLINGS; steps += 1) {
                if (isHeading(sibling)) {
                    found = sibling;
                    break;
                }
                // Un bloque sin controles puede envolver al encabezado (<div><h3>…</h3></div>).
                // Los bloques con controles son otros campos: se saltan sin mirar dentro.
                if (countControls(sibling) === 0) {
                    const inner = sibling.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']");
                    if (inner.length > 0) {
                        found = inner[inner.length - 1];
                        break;
                    }
                }
                sibling = sibling.previousElementSibling;
            }
            current = parentOf(current);
            if (current && (current.tagName === "FORM" || current.tagName === "BODY")) {
                break;
            }
        }
        if (found) {
            texts.push(textOf(found));
        }

        return texts.filter(Boolean);
    }

    /**
     * @param {Element} element
     * @returns {object} descriptor plano
     */
    function describe(element) {
        const kind = getKind(element);
        const label = getLabels(element);
        const ariaLabel = [element.getAttribute("aria-label"), element.getAttribute("title")].filter(Boolean);
        const placeholder = element.getAttribute("placeholder") || "";
        const maxLength = Number(element.getAttribute("maxlength")) || 0;

        return {
            kind,
            inputType: (element.getAttribute("type") || element.tagName).toLowerCase(),
            autocomplete: element.getAttribute("autocomplete") || "",
            placeholder,
            maxLength,
            sources: {
                label,
                ariaLabel,
                attributes: getAttributes(element),
                placeholder: placeholder ? [placeholder] : [],
                // Solo si no hay etiqueta explícita: el contenedor suele incluir textos de ayuda.
                nearbyLabel: label.length === 0 && ariaLabel.length === 0 ? getNearbyLabel(element) : [],
                section: getSection(element)
            }
        };
    }

    FillPro.fieldDescriptor = { describe, getKind, textOf, parentOf, CONTROL_SELECTOR };
})(globalThis);
