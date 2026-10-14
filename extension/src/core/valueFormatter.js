/**
 * Adapta un valor del perfil al formato que espera cada control:
 *   - input[type=number]  -> solo dígitos
 *   - input[type=date]    -> AAAA-MM-DD; en texto respeta el placeholder (dd/mm/aaaa...)
 *   - maxlength           -> usa el teléfono sin indicativo si cabe, o recorta textos largos
 *   - <select>            -> elige la opción equivalente (sinónimos, ISO de país,
 *                            indicativos, rangos "3 a 5 años", "$2.000.000 - $3.000.000")
 *
 * Funciones puras: reciben descriptores/opciones planas, no elementos del DOM.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    const NUMERIC_KEYS = new Set(["yearsExperience", "salaryExpectation", "graduationYear"]);
    const DIGIT_KEYS = new Set([...NUMERIC_KEYS, "phone", "phoneNational", "documentNumber", "postalCode"]);
    const TRUNCATABLE_KEYS = new Set(["summary", "skills", "languages", "headline"]);
    // Se evalúa sobre texto normalizado ("-- Seleccione --" -> "seleccione").
    const PLACEHOLDER_OPTION = /^(|selec\w*|elige\w*|escoge\w*|choose\w*|pick\w*|please select\w*|por favor\w*)(\s|$)/;

    function isEmpty(value) {
        return value === undefined || value === null || String(value).trim() === "";
    }

    // ---------------------------------------------------------------- fechas

    function formatDate(isoDate, placeholder) {
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || "");
        if (!match) {
            return null;
        }

        const [, year, month, day] = match;
        const hint = FillPro.text.simplify(placeholder || "");
        const pattern = /(dd|mm|aaaa|yyyy|aa|yy)([/.\-])(dd|mm|aaaa|yyyy|aa|yy)\2(dd|mm|aaaa|yyyy|aa|yy)/.exec(hint);

        if (!pattern) {
            return `${day}/${month}/${year}`;
        }

        const parts = { dd: day, mm: month, aaaa: year, yyyy: year, aa: year.slice(2), yy: year.slice(2) };
        const separator = pattern[2];
        return [pattern[1], pattern[3], pattern[4]].map((token) => parts[token]).join(separator);
    }

    // --------------------------------------------------------------- inputs

    /**
     * @param {string} key clave del catálogo
     * @param {Record<string, string|null>} profile perfil canónico
     * @param {{ kind: string, placeholder?: string, maxLength?: number }} descriptor
     * @returns {string|null}
     */
    function formatInputValue(key, profile, descriptor) {
        let value = profile[key];
        if (isEmpty(value)) {
            return null;
        }
        value = String(value).trim();

        if (key === "birthDate") {
            return descriptor.kind === "date" ? value.slice(0, 10) : formatDate(value, descriptor.placeholder);
        }

        if (descriptor.kind === "number") {
            if (!DIGIT_KEYS.has(key)) {
                return null;
            }
            const digits = value.replace(/\D/g, "");
            return digits || null;
        }

        const maxLength = descriptor.maxLength;
        if (maxLength > 0 && value.length > maxLength) {
            if (key === "phone" && profile.phoneNational && profile.phoneNational.length <= maxLength) {
                return profile.phoneNational;
            }
            return TRUNCATABLE_KEYS.has(key) ? value.slice(0, maxLength) : null;
        }

        return value;
    }

    // -------------------------------------------------------------- selects

    function selectCandidates(key, profile) {
        const value = profile[key];
        if (isEmpty(value)) {
            return [];
        }

        const { findCountry } = FillPro.countries;

        switch (key) {
            case "country": {
                const country = findCountry(value);
                return country
                    ? [value, ...country.names, country.iso2, country.iso3]
                    : [value];
            }
            case "phoneCountryCode": {
                const dial = String(value).replace(/\D/g, "");
                const country = findCountry(profile.country);
                const countryMatches = country && country.dial === dial;
                return [
                    `+${dial}`,
                    dial,
                    ...(countryMatches ? [...country.names, country.iso2, country.iso3] : [])
                ];
            }
            case "educationLevel":
                return [value, ...FillPro.valueSynonyms.educationLevel(value)];
            case "documentType":
                return [value, ...FillPro.valueSynonyms.documentType(value)];
            default:
                return [String(value)];
        }
    }

    function parseLocaleNumber(raw) {
        if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
            return Number(raw.replace(/[.,]/g, ""));
        }
        return Number(raw.replace(",", "."));
    }

    /** Convierte el texto de una opción en un rango numérico [min, max]. */
    function parseRange(text) {
        const simple = FillPro.text.simplify(text);

        if (/\b(sin|no|ninguna|none|without)\s+(experiencia|experience)\b/.test(simple)) {
            return { min: 0, max: 0 };
        }

        const numbers = [];
        const numberPattern = /(\d[\d.,]*)\s*(millones|millon|millions|million|mm|k|mil)?\b/g;
        let found;
        while ((found = numberPattern.exec(simple)) !== null) {
            const multiplier = /^(millon|millones|million|millions|mm)$/.test(found[2] || "")
                ? 1e6
                : /^(k|mil)$/.test(found[2] || "") ? 1e3 : 1;
            const number = parseLocaleNumber(found[1].replace(/[.,]$/, ""));
            if (Number.isFinite(number)) {
                numbers.push(number * multiplier);
            }
        }

        if (numbers.length === 0) {
            return null;
        }

        const [first, second] = numbers;
        if (/\b(menos de|less than|under|inferior a|menor a|menor que)\b|</.test(simple)) {
            return { min: 0, max: first, maxExclusive: true };
        }
        if (/\b(hasta|up to)\b/.test(simple) && numbers.length === 1) {
            return { min: 0, max: first };
        }
        if (/\b(mas de|more than|over|superior a|mayor a|mayor que)\b|>/.test(simple)) {
            return { min: first, max: Infinity, minExclusive: true };
        }
        if (/\b(o mas|or more|en adelante|y mas|and above)\b|\d\s*\+|\+\s*\d/.test(simple)) {
            return { min: first, max: Infinity };
        }
        if (numbers.length >= 2) {
            return { min: Math.min(first, second), max: Math.max(first, second) };
        }
        return { min: first, max: first };
    }

    function inRange(range, number) {
        const aboveMin = range.minExclusive ? number > range.min : number >= range.min;
        const belowMax = range.maxExclusive ? number < range.max : number <= range.max;
        return aboveMin && belowMax;
    }

    function isPlaceholderOption(option) {
        return option.disabled
            || (String(option.value ?? "").trim() === "" && PLACEHOLDER_OPTION.test(FillPro.text.normalizeText(option.text)))
            || (option.index === 0 && PLACEHOLDER_OPTION.test(FillPro.text.normalizeText(option.text)));
    }

    /**
     * Elige la opción que mejor representa el valor del perfil.
     * @param {string} key
     * @param {Record<string, string|null>} profile
     * @param {{ value: string, text: string, disabled?: boolean, index: number }[]} options
     * @returns {number} índice de la opción o -1
     */
    function chooseOption(key, profile, options) {
        const { normalizeText, tokenize, compact, findPhrase } = FillPro.text;
        const usable = options.filter((option) => !isPlaceholderOption(option));
        const candidates = selectCandidates(key, profile).filter((candidate) => !isEmpty(candidate));

        if (usable.length === 0 || candidates.length === 0) {
            return -1;
        }

        // 1) Coincidencia exacta con el value o el texto de la opción.
        //    Un candidato numérico ("4") solo se compara con el texto: los value
        //    numéricos suelen ser ids internos del portal, no el dato.
        for (const candidate of candidates) {
            const needle = normalizeText(candidate);
            const numeric = /^\d+$/.test(needle);
            const option = usable.find((item) =>
                (!numeric && normalizeText(item.value) === needle) || normalizeText(item.text) === needle);
            if (option) {
                return option.index;
            }
        }

        // 2) El texto de la opción contiene el candidato ("Colombia (+57)" contiene "Colombia").
        const byLength = [...candidates].sort((a, b) => compact(b).length - compact(a).length);
        for (const candidate of byLength) {
            const needle = compact(candidate);
            if (needle.length < 2) {
                continue;
            }
            const option = usable.find((item) => findPhrase(tokenize(item.text), needle) !== null);
            if (option) {
                return option.index;
            }
        }

        // 3) Valores numéricos dentro de rangos ("Entre 3 y 5 años", "Más de 10").
        if (NUMERIC_KEYS.has(key)) {
            const number = Number(String(profile[key]).replace(/[^\d.]/g, ""));
            if (Number.isFinite(number)) {
                const option = usable.find((item) => {
                    const range = parseRange(item.text);
                    return range && inRange(range, number);
                });
                if (option) {
                    return option.index;
                }
            }
        }

        return -1;
    }

    FillPro.valueFormatter = {
        formatInputValue,
        formatDate,
        chooseOption,
        parseRange,
        isPlaceholderOption
    };
})(globalThis);
