/**
 * Indeed — formularios de "Postularse" (smartapply.indeed.com) y perfil.
 * Se excluyen los buscadores "Qué" y "Dónde" de la portada.
 */
(function (global) {
    "use strict";

    global.FillPro.siteRegistry.register({
        id: "indeed",
        name: "Indeed",
        hostPatterns: [/(^|\.)indeed\.com(\.[a-z]{2})?$/],
        excludeSelectors: ["#text-input-what", "#text-input-where", "[role='search'] input"],
        fieldRules: [
            { key: "firstName", selectors: ["input[name='firstName']", "input[id$='firstName']"] },
            { key: "lastName", selectors: ["input[name='lastName']", "input[id$='lastName']"] },
            { key: "phone", selectors: ["input[name='phoneNumber']", "input[id$='phoneNumber']"] }
        ]
    });
})(globalThis);
