/**
 * Computrabajo — registro, "Mi hoja de vida" y formularios de postulación
 * (co.computrabajo.com, mx., pe., ar., cl., ec., ...).
 *
 * - Los formularios son en español latino: los cubre el catálogo genérico.
 * - Se pide el celular sin indicativo (el país ya se elige en otro campo).
 * - Se excluyen los buscadores de ofertas del encabezado.
 */
(function (global) {
    "use strict";

    global.FillPro.siteRegistry.register({
        id: "computrabajo",
        name: "Computrabajo",
        hostPatterns: [/(^|\.)computrabajo\.com(\.[a-z]{2})?$/],
        excludeSelectors: [
            "#prof-cat-search-input",
            "#place-search-input",
            "form[action*='trabajo-de'] input",
            "form[role='search'] input",
            "[role='search'] input"
        ],
        keywordHints: {
            city: ["localidad", "municipio de residencia"],
            state: ["departamento de residencia", "provincia de residencia"],
            salaryExpectation: ["salario deseado", "aspiracion salarial"],
            headline: ["cargo o titulo", "titulo de tu hoja de vida"],
            summary: ["presentacion", "descripcion de tu perfil"]
        },
        keyAliases: {
            phone: "phoneNational"
        }
    });
})(globalThis);
