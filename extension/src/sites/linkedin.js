/**
 * LinkedIn — "Solicitud sencilla" (Easy Apply) y modales de edición del perfil.
 *
 * - Solo se trabaja dentro del diálogo abierto, para no tocar el buscador
 *   global ni la mensajería.
 * - El teléfono se pide en dos controles: indicativo (select) y número
 *   nacional (input cuyo id termina en "phoneNumber-nationalNumber").
 * - Las etiquetas están en el idioma de la cuenta (es/en): las cubre el catálogo.
 */
(function (global) {
    "use strict";

    global.FillPro.siteRegistry.register({
        id: "linkedin",
        name: "LinkedIn",
        hostPatterns: [/(^|\.)linkedin\.com$/],
        scopeSelectors: [
            ".jobs-easy-apply-modal",
            "[data-test-modal-id='easy-apply-modal']",
            ".artdeco-modal[role='dialog']",
            "[role='dialog'][aria-modal='true']"
        ],
        excludeSelectors: [
            "input.search-global-typeahead__input",
            "[role='search'] input",
            ".msg-form input",
            ".msg-form textarea"
        ],
        fieldRules: [
            { key: "phoneNational", selectors: ["input[id*='phoneNumber-nationalNumber']", "input[id$='nationalNumber']"] },
            { key: "phoneCountryCode", selectors: ["select[id*='phoneNumber-country']"] },
            { key: "firstName", selectors: ["input[id$='-firstName']", "input[id$='firstName']"] },
            { key: "lastName", selectors: ["input[id$='-lastName']", "input[id$='lastName']"] }
        ],
        keywordHints: {
            location: ["location city", "ubicacion ciudad"],
            headline: ["titular"]
        }
    });
})(globalThis);
