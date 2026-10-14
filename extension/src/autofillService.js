/**
 * Orquestador del autocompletado (fachada usada por content.js).
 *
 *   perfil API ─► profileAdapter ─► perfil canónico
 *   documento  ─► siteRegistry (portal) ─► fieldScanner (controles)
 *              ─► fieldDescriptor ─► fieldMatcher (clave) ─► reglas de contexto
 *              ─► valueFormatter (formato) ─► fieldFiller (DOM + eventos)
 *
 * Cada pieza tiene una sola responsabilidad y se puede probar por separado.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    function groupOf(element) {
        return element.form || element.getRootNode();
    }

    /**
     * Reglas que dependen de los demás campos del mismo formulario:
     * si el formulario tiene un campo de indicativo, el teléfono va sin él.
     */
    function applyFormContextRules(matches) {
        const groupsWithDialCode = new Set(
            matches.filter((match) => match.key === "phoneCountryCode").map((match) => groupOf(match.element))
        );

        for (const match of matches) {
            if (match.key === "phone" && groupsWithDialCode.has(groupOf(match.element))) {
                match.key = "phoneNational";
            }
        }
        return matches;
    }

    function hasValue(value) {
        return value !== undefined && value !== null && String(value).trim() !== "";
    }

    function fillOne(match, profile, options) {
        const { element, key, descriptor } = match;
        const { valueFormatter, fieldFiller } = FillPro;

        if (descriptor.kind === "select") {
            const index = valueFormatter.chooseOption(key, profile, fieldFiller.readOptions(element));
            return index < 0 ? "nomatch" : fieldFiller.fillSelect(element, index, options);
        }

        const value = valueFormatter.formatInputValue(key, profile, descriptor);
        return value === null ? "nomatch" : fieldFiller.fillText(element, value, options);
    }

    /**
     * @param {{ profile: object, skills?: string[], accountEmail?: string }} payload
     * @param {{ document?: Document, hostname?: string, overwrite?: boolean }} [options]
     * @returns {{ filled: number, fields: string[], skipped: number, site: string|null }}
     */
    function run(payload, options = {}) {
        const doc = options.document || global.document;
        const hostname = options.hostname ?? doc.location?.hostname ?? "";
        const site = FillPro.siteRegistry.resolve(hostname);

        const profile = FillPro.profileAdapter.toCanonicalProfile(payload?.profile, {
            skills: payload?.skills,
            accountEmail: payload?.accountEmail
        });

        const matches = [];
        for (const element of FillPro.fieldScanner.collect(doc, site)) {
            const descriptor = FillPro.fieldDescriptor.describe(element);
            const result = FillPro.fieldMatcher.match(descriptor, {
                siteKey: FillPro.siteRegistry.ruleKeyFor(site, element),
                keywordHints: site?.keywordHints
            });
            if (result) {
                matches.push({ element, descriptor, key: result.key, score: result.score });
            }
        }

        applyFormContextRules(matches);

        const filledKeys = [];
        let filled = 0;
        let skipped = 0;

        for (const match of matches) {
            match.key = site?.keyAliases?.[match.key] && hasValue(profile[site.keyAliases[match.key]])
                ? site.keyAliases[match.key]
                : match.key;

            if (!hasValue(profile[match.key])) {
                continue;
            }

            const status = fillOne(match, profile, { overwrite: Boolean(options.overwrite) });
            if (status === "filled") {
                filled += 1;
                filledKeys.push(match.key);
            } else if (status === "skipped") {
                skipped += 1;
            }
        }

        return {
            filled,
            fields: [...new Set(filledKeys)],
            skipped,
            site: site?.name ?? null
        };
    }

    FillPro.autofillService = { run, applyFormContextRules };
})(globalThis);
