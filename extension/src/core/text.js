/**
 * Utilidades de texto para comparar etiquetas, atributos y opciones.
 *
 * La comparación trabaja con "tokens" normalizados (minúsculas, sin tildes,
 * camelCase separado). Para que `LinkedIn`, `linkedin_url`, `linkedInProfile`
 * o `E-mail` coincidan con sus palabras clave, una frase se busca como una
 * secuencia contigua de tokens cuya unión (sin espacios) es igual a la frase
 * compactada. Esto evita falsos positivos de `includes()` (p. ej. "tel" dentro
 * de "hotel").
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});
    const MAX_RUN = 7;

    function stripAccents(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    /** Minúsculas y sin tildes, conservando signos (útil para rangos "+5", "<1"). */
    function simplify(value) {
        return stripAccents(value).toLowerCase().replace(/\s+/g, " ").trim();
    }

    /** Lista de tokens alfanuméricos. Separa camelCase antes de pasar a minúsculas. */
    function tokenize(value) {
        const text = stripAccents(value)
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
            .toLowerCase();
        return text.split(/[^a-z0-9]+/).filter(Boolean);
    }

    function normalizeText(value) {
        return tokenize(value).join(" ");
    }

    /** Forma compacta de una frase clave: "E-mail address" -> "emailaddress". */
    function compact(value) {
        return tokenize(value).join("");
    }

    /**
     * Busca `phrase` dentro de `tokens` como secuencia contigua.
     * Acepta plural simple en la frase ("apellido" ~ "apellidos").
     * @param {string[]} tokens
     * @param {string} compactPhrase frase ya compactada
     * @param {boolean[]} [consumed] tokens que no deben usarse
     * @returns {{ start: number, length: number } | null}
     */
    function findPhrase(tokens, compactPhrase, consumed) {
        if (!compactPhrase) {
            return null;
        }

        for (let start = 0; start < tokens.length; start += 1) {
            if (consumed?.[start]) {
                continue;
            }

            let joined = "";
            for (let length = 1; length <= MAX_RUN && start + length <= tokens.length; length += 1) {
                if (consumed?.[start + length - 1]) {
                    break;
                }

                joined += tokens[start + length - 1];
                if (joined.length > compactPhrase.length + 2) {
                    break;
                }

                if (joined === compactPhrase
                    || joined === `${compactPhrase}s`
                    || joined === `${compactPhrase}es`) {
                    return { start, length };
                }
            }
        }

        return null;
    }

    function containsPhrase(value, phrase) {
        return findPhrase(tokenize(value), compact(phrase)) !== null;
    }

    FillPro.text = {
        stripAccents,
        simplify,
        tokenize,
        normalizeText,
        compact,
        findPhrase,
        containsPhrase
    };
})(globalThis);
