/**
 * Adapta el perfil que devuelve la API (snake_case o camelCase) a un perfil
 * canónico cuyas claves coinciden con las del catálogo de campos
 * (FillPro.fieldCatalog). Además deriva los formatos que piden los portales:
 * nombre completo, primer/segundo apellido, teléfono sin indicativo,
 * indicativo, ubicación "Ciudad, Departamento, País" y URLs completas.
 *
 * Responsabilidad única: transformar datos. No toca el DOM.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    function clean(value) {
        if (value === undefined || value === null) {
            return null;
        }
        const text = String(value).trim();
        return text === "" ? null : text;
    }

    function pick(source, camelKey) {
        const snakeKey = camelKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        return clean(source[camelKey] ?? source[snakeKey]);
    }

    function splitWords(value) {
        return value ? value.split(/\s+/).filter(Boolean) : [];
    }

    function ensureProtocol(url) {
        return /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, "")}`;
    }

    /** "juan", "linkedin.com/in/juan" o una URL completa -> URL completa. */
    function toProfileUrl(value, domain, pathPrefix) {
        if (!value) {
            return null;
        }
        if (/^[\w-]+$/.test(value)) {
            return `https://${domain}/${pathPrefix}${value}`;
        }
        return ensureProtocol(value);
    }

    function parsePhone(rawPhone, country) {
        if (!rawPhone) {
            return { national: null, dial: country?.dial ?? null };
        }

        const digits = rawPhone.replace(/\D/g, "");
        const isInternational = /^\s*(\+|00)/.test(rawPhone);

        if (!isInternational) {
            return { national: digits || null, dial: country?.dial ?? null };
        }

        const internationalDigits = rawPhone.trim().startsWith("00") ? digits.slice(2) : digits;
        const dialCountry = country && internationalDigits.startsWith(country.dial)
            ? country
            : FillPro.countries.findCountryByPhone(internationalDigits);

        if (!dialCountry) {
            return { national: internationalDigits, dial: null };
        }

        return {
            national: internationalDigits.slice(dialCountry.dial.length) || null,
            dial: dialCountry.dial
        };
    }

    /**
     * @param {object} apiProfile perfil de GET /profile (snake_case) o camelCase
     * @param {{ skills?: string[], accountEmail?: string }} [extras]
     * @returns {Record<string, string|null>} perfil canónico
     */
    function toCanonicalProfile(apiProfile, extras = {}) {
        const source = apiProfile && typeof apiProfile === "object" ? apiProfile : {};
        const skills = Array.isArray(extras.skills ?? source.skills) ? (extras.skills ?? source.skills) : [];

        const firstName = pick(source, "firstName");
        const lastName = pick(source, "lastName");
        const country = pick(source, "country");
        const state = pick(source, "state");
        const city = pick(source, "city");
        const phone = pick(source, "phone");

        const countryInfo = FillPro.countries.findCountry(country);
        const { national, dial } = parsePhone(phone, countryInfo);
        const givenNames = splitWords(firstName);
        const surnames = splitWords(lastName);

        const profile = {
            firstName,
            lastName,
            fullName: [firstName, lastName].filter(Boolean).join(" ") || null,
            firstGivenName: givenNames[0] ?? null,
            middleName: givenNames.length > 1 ? givenNames.slice(1).join(" ") : null,
            firstSurname: surnames[0] ?? null,
            secondSurname: surnames.length > 1 ? surnames.slice(1).join(" ") : null,
            email: pick(source, "email") ?? clean(extras.accountEmail ?? source.accountEmail),
            phone,
            phoneNational: national,
            phoneCountryCode: dial ? `+${dial}` : null,
            documentType: pick(source, "documentType"),
            documentNumber: pick(source, "documentNumber"),
            birthDate: pick(source, "birthDate")?.slice(0, 10) ?? null,
            country,
            state,
            city,
            address: pick(source, "address"),
            postalCode: pick(source, "postalCode"),
            location: [city, state, country].filter(Boolean).join(", ") || null,
            headline: pick(source, "headline"),
            summary: pick(source, "summary"),
            currentTitle: pick(source, "currentTitle"),
            currentCompany: pick(source, "currentCompany"),
            yearsExperience: pick(source, "yearsExperience"),
            salaryExpectation: pick(source, "salaryExpectation"),
            educationLevel: pick(source, "educationLevel"),
            institution: pick(source, "institution"),
            fieldOfStudy: pick(source, "fieldOfStudy"),
            graduationYear: pick(source, "graduationYear"),
            languages: pick(source, "languages"),
            skills: clean(skills.map(clean).filter(Boolean).join(", ")),
            linkedin: toProfileUrl(pick(source, "linkedin"), "www.linkedin.com", "in/"),
            github: toProfileUrl(pick(source, "github"), "github.com", ""),
            portfolio: (() => {
                const url = pick(source, "portfolio");
                return url ? ensureProtocol(url) : null;
            })()
        };

        return profile;
    }

    FillPro.profileAdapter = { toCanonicalProfile, parsePhone, toProfileUrl };
})(globalThis);
