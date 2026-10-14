/**
 * Motor de reconocimiento: decide qué dato del perfil corresponde a un campo.
 *
 * Recibe un "descriptor" (objeto plano generado por FillPro.fieldDescriptor,
 * sin referencias obligatorias al DOM) y devuelve la clave del catálogo con
 * mayor puntaje. Puntaje = suma de evidencias:
 *
 *   regla del portal (selector)          1000  (definitiva)
 *   token autocomplete estándar           300
 *   label / aria-label / title            100  ┐
 *   name, id, data-* , formcontrolname     80  │ × especificidad (palabras)
 *   texto cercano (contenedor del campo)   70  │ × 1.5 si el texto completo
 *   placeholder                            60  ┘   es exactamente la frase
 *   bonus por type (email, tel)          catálogo
 *
 * Una frase de exclusión que aparezca en el texto (fuera de la palabra clave
 * que coincidió) descarta esa definición: "Nombre de la empresa" no es
 * firstName aunque contenga "nombre".
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    const SOURCE_WEIGHTS = {
        label: 100,
        ariaLabel: 100,
        attributes: 80,
        nearbyLabel: 70,
        placeholder: 60
    };
    const AUTOCOMPLETE_SCORE = 300;
    const SITE_RULE_SCORE = 1000;
    const MIN_SCORE = 60;

    const AUTOCOMPLETE_IGNORED = new Set([
        "on", "off", "nope", "false", "true", "none", "disabled", "new-password", "current-password",
        "one-time-code", "shipping", "billing", "home", "work", "mobile", "fax", "pager", "webauthn"
    ]);

    let compiledCatalog = null;

    function compilePhrases(phrases) {
        const { compact } = FillPro.text;
        return (phrases || [])
            .map((phrase) => ({
                compact: compact(phrase),
                words: FillPro.text.tokenize(phrase).length
            }))
            .filter((phrase) => phrase.compact)
            // Las frases más largas primero: "nombre completo" antes que "nombre".
            .sort((a, b) => b.compact.length - a.compact.length);
    }

    function compileCatalog() {
        if (compiledCatalog) {
            return compiledCatalog;
        }

        const catalog = FillPro.fieldCatalog;
        compiledCatalog = {
            definitions: catalog.FIELD_DEFINITIONS.map((definition) => ({
                ...definition,
                compiledKeywords: compilePhrases(definition.keywords),
                compiledExclude: compilePhrases(definition.exclude),
                autocompleteSet: new Set(definition.autocomplete || [])
            })),
            globalExclude: compilePhrases(catalog.GLOBAL_EXCLUDE),
            sectionExclude: compilePhrases(catalog.SECTION_EXCLUDE)
        };
        return compiledCatalog;
    }

    function containsAny(tokens, compiledPhrases, consumed) {
        return compiledPhrases.some((phrase) => FillPro.text.findPhrase(tokens, phrase.compact, consumed) !== null);
    }

    /**
     * Evalúa un texto contra una definición.
     * @returns {{ score: number, excluded: boolean }}
     */
    function scoreText(tokens, definition, weight) {
        let best = null;
        const consumed = new Array(tokens.length).fill(false);

        for (const keyword of definition.compiledKeywords) {
            const found = FillPro.text.findPhrase(tokens, keyword.compact, consumed);
            if (!found) {
                continue;
            }

            for (let index = found.start; index < found.start + found.length; index += 1) {
                consumed[index] = true;
            }

            if (!best) {
                const exact = found.length === tokens.length;
                best = weight * (1 + 0.5 * (keyword.words - 1)) * (exact ? 1.5 : 1);
            }
        }

        if (!best) {
            return { score: 0, excluded: false };
        }

        // La exclusión se evalúa sobre lo que NO forma parte de la palabra clave.
        const excluded = containsAny(tokens, definition.compiledExclude, consumed);
        return { score: excluded ? 0 : best, excluded };
    }

    function autocompleteToken(value) {
        const tokens = String(value || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
        for (let index = tokens.length - 1; index >= 0; index -= 1) {
            const token = tokens[index];
            if (!token.startsWith("section-") && !AUTOCOMPLETE_IGNORED.has(token)) {
                return token;
            }
        }
        return null;
    }

    function tokenizedSources(descriptor) {
        const { tokenize } = FillPro.text;
        const result = {};
        for (const sourceName of Object.keys(SOURCE_WEIGHTS)) {
            result[sourceName] = (descriptor.sources?.[sourceName] || [])
                .map((text) => tokenize(text))
                .filter((tokens) => tokens.length > 0);
        }
        return result;
    }

    /** ¿El campo es un buscador, contraseña, captcha o pertenece a referencias/emergencia? */
    function isGloballyExcluded(descriptor, sources) {
        const catalog = compileCatalog();
        const primary = Object.values(sources).flat();

        if (primary.some((tokens) => containsAny(tokens, catalog.globalExclude))) {
            return true;
        }

        const { tokenize } = FillPro.text;
        return (descriptor.sources?.section || [])
            .map((text) => tokenize(text))
            .some((tokens) => containsAny(tokens, catalog.sectionExclude));
    }

    /**
     * @param {object} descriptor ver FillPro.fieldDescriptor.describe
     * @param {{ siteKey?: string|null, keywordHints?: Record<string, string[]> }} [hints]
     * @returns {{ key: string, score: number } | null}
     */
    function match(descriptor, hints = {}) {
        if (!descriptor || !descriptor.kind) {
            return null;
        }

        const catalog = compileCatalog();

        if (hints.siteKey) {
            return { key: hints.siteKey, score: SITE_RULE_SCORE };
        }

        const sources = tokenizedSources(descriptor);
        if (isGloballyExcluded(descriptor, sources)) {
            return null;
        }

        const autocomplete = autocompleteToken(descriptor.autocomplete);
        let best = null;

        for (const definition of catalog.definitions) {
            if (!definition.kinds.includes(descriptor.kind)) {
                continue;
            }

            let score = 0;
            let excluded = false;

            if (autocomplete && definition.autocompleteSet.has(autocomplete)) {
                score += AUTOCOMPLETE_SCORE;
            }

            for (const [sourceName, texts] of Object.entries(sources)) {
                let sourceBest = 0;
                for (const tokens of texts) {
                    const result = scoreText(tokens, definition, SOURCE_WEIGHTS[sourceName]);
                    // Los textos que lee una persona (label, placeholder...) descartan la
                    // definición. Los atributos técnicos (ids generados con mucho "ruido",
                    // p. ej. "...-jobs-applyformcommon-...-firstName") solo anulan su propio aporte.
                    if (sourceName !== "attributes") {
                        excluded = excluded || result.excluded;
                    }
                    sourceBest = Math.max(sourceBest, result.score);
                }
                score += sourceBest;
            }

            const extraKeywords = hints.keywordHints?.[definition.key];
            if (extraKeywords?.length) {
                const compiled = { ...definition, compiledKeywords: compilePhrases(extraKeywords) };
                for (const tokens of [...sources.label, ...sources.ariaLabel, ...sources.nearbyLabel]) {
                    score += scoreText(tokens, compiled, SOURCE_WEIGHTS.label).score;
                }
            }

            if (excluded && score < AUTOCOMPLETE_SCORE) {
                continue;
            }

            if (score > 0) {
                score += definition.typeBonus?.[descriptor.inputType] || 0;
            }

            if (score >= MIN_SCORE && (!best || score > best.score)) {
                best = { key: definition.key, score };
            }
        }

        return best;
    }

    FillPro.fieldMatcher = { match, MIN_SCORE, SITE_RULE_SCORE };
})(globalThis);
