/**
 * elempleo (Colombia) — registro y hoja de vida.
 * Pide nombres y apellidos por separado (primer/segundo apellido) y el
 * celular nacional sin indicativo.
 */
(function (global) {
    "use strict";

    global.FillPro.siteRegistry.register({
        id: "elempleo",
        name: "elempleo",
        hostPatterns: [/(^|\.)elempleo\.com$/],
        excludeSelectors: ["[role='search'] input", "form[action*='ofertas-empleo'] input"],
        keyAliases: {
            phone: "phoneNational"
        }
    });
})(globalThis);
