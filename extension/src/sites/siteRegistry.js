/**
 * Registro de adaptadores por portal (patrón Strategy + Open/Closed).
 *
 * El motor genérico (catálogo + heurísticas) funciona en cualquier página.
 * Un adaptador solo AGREGA conocimiento específico de un portal:
 *
 *   {
 *     id: "linkedin",
 *     name: "LinkedIn",
 *     hostPatterns: [/(^|\.)linkedin\.com$/],
 *     scopeSelectors:   [...],  // si existe alguno, solo se completa dentro (p. ej. un modal)
 *     excludeSelectors: [...],  // controles que nunca se tocan (buscadores del portal)
 *     fieldRules: [{ key: "phoneNational", selectors: ["input[id$='nationalNumber']"] }],
 *     keywordHints: { city: ["lugar de residencia"] },  // vocabulario propio del portal
 *     keyAliases:   { phone: "phoneNational" }          // formato de dato que espera el portal
 *   }
 *
 * Para soportar un portal nuevo: crear src/sites/<portal>.js que llame a
 * FillPro.siteRegistry.register({...}) y agregarlo en manifest.json.
 * No hay que modificar el motor.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});
    const sites = [];

    function validate(site) {
        if (!site || typeof site.id !== "string" || !Array.isArray(site.hostPatterns)) {
            throw new Error("FillPro: un sitio necesita `id` y `hostPatterns`.");
        }
        const knownKeys = new Set(FillPro.fieldCatalog.FIELD_DEFINITIONS.map((definition) => definition.key));
        for (const rule of site.fieldRules || []) {
            if (!knownKeys.has(rule.key)) {
                throw new Error(`FillPro: la regla de ${site.id} usa una clave desconocida: ${rule.key}`);
            }
        }
    }

    function register(site) {
        validate(site);
        const index = sites.findIndex((existing) => existing.id === site.id);
        const normalized = {
            scopeSelectors: [],
            excludeSelectors: [],
            fieldRules: [],
            keywordHints: {},
            keyAliases: {},
            ...site
        };
        if (index >= 0) {
            sites[index] = normalized;
        } else {
            sites.push(normalized);
        }
        return normalized;
    }

    /** Adaptador del portal para un hostname, o null si es un sitio genérico. */
    function resolve(hostname) {
        const host = String(hostname || "").toLowerCase();
        return sites.find((site) => site.hostPatterns.some((pattern) => pattern.test(host))) || null;
    }

    /** Clave que el portal fija explícitamente para un elemento (por selector). */
    function ruleKeyFor(site, element) {
        if (!site) {
            return null;
        }
        const rule = site.fieldRules.find((candidate) =>
            FillPro.fieldScanner.matchesAny(element, candidate.selectors));
        return rule ? rule.key : null;
    }

    FillPro.siteRegistry = {
        register,
        resolve,
        ruleKeyFor,
        list: () => sites.slice()
    };
})(globalThis);
