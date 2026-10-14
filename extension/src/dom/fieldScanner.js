/**
 * Recolecta los controles de formulario que FillPro puede completar.
 *
 * Recorre el documento, los shadow roots abiertos (Web Components) y los
 * iframes del mismo origen; así cubre formularios como el "Easy Apply" de
 * LinkedIn, que puede renderizarse dentro de un iframe same-origin con
 * Shadow DOM. Los iframes de otro origen no son accesibles por seguridad
 * del navegador y se omiten silenciosamente.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    const MAX_DEPTH = 5;
    /** Nunca se tocan, en ningún sitio: buscadores declarados como tales. */
    const GLOBAL_EXCLUDE_SELECTORS = ["[role='search'] input", "[role='search'] select", "[role='search'] textarea"];

    /** Documentos y shadow roots alcanzables desde `root`. */
    function collectRoots(root, depth = 0, roots = []) {
        if (!root || depth > MAX_DEPTH || roots.includes(root)) {
            return roots;
        }
        roots.push(root);

        for (const element of root.querySelectorAll("*")) {
            if (element.shadowRoot) {
                collectRoots(element.shadowRoot, depth + 1, roots);
            }
            if (element.tagName === "IFRAME" || element.tagName === "FRAME") {
                let frameDocument = null;
                try {
                    frameDocument = element.contentDocument;
                } catch (_error) {
                    frameDocument = null; // iframe de otro origen
                }
                if (frameDocument && frameDocument.documentElement) {
                    collectRoots(frameDocument, depth + 1, roots);
                }
            }
        }

        return roots;
    }

    function matchesAny(element, selectors) {
        return (selectors || []).some((selector) => {
            try {
                return element.matches(selector);
            } catch (_error) {
                return false; // selector inválido en la definición de un sitio
            }
        });
    }

    function queryAll(root, selectors) {
        const found = [];
        for (const selector of selectors || []) {
            try {
                found.push(...root.querySelectorAll(selector));
            } catch (_error) {
                // selector inválido: se ignora
            }
        }
        return found;
    }

    function isHiddenByStyle(element) {
        if (typeof element.checkVisibility === "function") {
            return !element.checkVisibility({ visibilityProperty: true, opacityProperty: false });
        }

        const view = element.ownerDocument.defaultView;
        if (!view || typeof view.getComputedStyle !== "function") {
            return false;
        }

        let current = element;
        while (current && current.nodeType === 1) {
            const style = view.getComputedStyle(current);
            if (style.display === "none" || (current === element && style.visibility === "hidden")) {
                return true;
            }
            current = FillPro.fieldDescriptor.parentOf(current);
        }
        return false;
    }

    /** ¿Se puede (y se debe) escribir en este control? */
    function isFillable(element) {
        if (!FillPro.fieldDescriptor.getKind(element)) {
            return false;
        }
        if (element.disabled || element.readOnly || element.hidden) {
            return false;
        }
        if (element.getAttribute("aria-hidden") === "true" || element.closest("[aria-hidden='true'], [inert]")) {
            return false;
        }
        return !isHiddenByStyle(element);
    }

    /**
     * @param {Document} doc
     * @param {{ scopeSelectors?: string[], excludeSelectors?: string[] } | null} site
     * @returns {Element[]} controles completables, en orden de documento
     */
    function collect(doc, site) {
        const roots = collectRoots(doc);
        const { CONTROL_SELECTOR } = FillPro.fieldDescriptor;

        // Si el portal define un contenedor (p. ej. el modal de LinkedIn) y está
        // abierto, solo se trabaja dentro de él para no tocar el resto de la página.
        const scopes = roots.flatMap((root) => queryAll(root, site?.scopeSelectors));
        const searchRoots = scopes.length > 0
            ? scopes.flatMap((scope) => collectRoots(scope))
            : roots;

        const controls = new Set();
        for (const root of searchRoots) {
            for (const element of root.querySelectorAll(CONTROL_SELECTOR)) {
                if (controls.has(element)
                    || matchesAny(element, GLOBAL_EXCLUDE_SELECTORS)
                    || matchesAny(element, site?.excludeSelectors)) {
                    continue;
                }
                if (isFillable(element)) {
                    controls.add(element);
                }
            }
        }

        return Array.from(controls);
    }

    FillPro.fieldScanner = { collect, collectRoots, isFillable, matchesAny };
})(globalThis);
