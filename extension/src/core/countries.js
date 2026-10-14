/**
 * Catálogo mínimo de países para adaptar el país del perfil a los distintos
 * formatos que usan los portales: nombre en español/inglés, ISO-2, ISO-3 e
 * indicativo telefónico ("Colombia" -> "CO", "COL", "+57", "Colombia (+57)").
 *
 * Para soportar otro país basta con agregar una entrada.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    const COUNTRIES = [
        { iso2: "CO", iso3: "COL", dial: "57", names: ["Colombia"] },
        { iso2: "MX", iso3: "MEX", dial: "52", names: ["México", "Mexico"] },
        { iso2: "PE", iso3: "PER", dial: "51", names: ["Perú", "Peru"] },
        { iso2: "AR", iso3: "ARG", dial: "54", names: ["Argentina"] },
        { iso2: "CL", iso3: "CHL", dial: "56", names: ["Chile"] },
        { iso2: "EC", iso3: "ECU", dial: "593", names: ["Ecuador"] },
        { iso2: "VE", iso3: "VEN", dial: "58", names: ["Venezuela"] },
        { iso2: "BO", iso3: "BOL", dial: "591", names: ["Bolivia"] },
        { iso2: "PY", iso3: "PRY", dial: "595", names: ["Paraguay"] },
        { iso2: "UY", iso3: "URY", dial: "598", names: ["Uruguay"] },
        { iso2: "PA", iso3: "PAN", dial: "507", names: ["Panamá", "Panama"] },
        { iso2: "CR", iso3: "CRI", dial: "506", names: ["Costa Rica"] },
        { iso2: "GT", iso3: "GTM", dial: "502", names: ["Guatemala"] },
        { iso2: "SV", iso3: "SLV", dial: "503", names: ["El Salvador"] },
        { iso2: "HN", iso3: "HND", dial: "504", names: ["Honduras"] },
        { iso2: "NI", iso3: "NIC", dial: "505", names: ["Nicaragua"] },
        { iso2: "DO", iso3: "DOM", dial: "1", names: ["República Dominicana", "Dominican Republic"] },
        { iso2: "PR", iso3: "PRI", dial: "1", names: ["Puerto Rico"] },
        { iso2: "CU", iso3: "CUB", dial: "53", names: ["Cuba"] },
        { iso2: "BR", iso3: "BRA", dial: "55", names: ["Brasil", "Brazil"] },
        { iso2: "ES", iso3: "ESP", dial: "34", names: ["España", "Spain"] },
        { iso2: "US", iso3: "USA", dial: "1", names: ["Estados Unidos", "United States", "United States of America", "EE UU", "EEUU", "USA"] },
        { iso2: "CA", iso3: "CAN", dial: "1", names: ["Canadá", "Canada"] },
        { iso2: "GB", iso3: "GBR", dial: "44", names: ["Reino Unido", "United Kingdom", "UK"] },
        { iso2: "DE", iso3: "DEU", dial: "49", names: ["Alemania", "Germany"] },
        { iso2: "FR", iso3: "FRA", dial: "33", names: ["Francia", "France"] },
        { iso2: "IT", iso3: "ITA", dial: "39", names: ["Italia", "Italy"] },
        { iso2: "PT", iso3: "PRT", dial: "351", names: ["Portugal"] }
    ];

    /** Busca un país por nombre, ISO-2 o ISO-3 (sin importar tildes ni mayúsculas). */
    function findCountry(value) {
        const { normalizeText } = FillPro.text;
        const needle = normalizeText(value);
        if (!needle) {
            return null;
        }

        return COUNTRIES.find((country) =>
            country.iso2.toLowerCase() === needle
            || country.iso3.toLowerCase() === needle
            || country.names.some((name) => normalizeText(name) === needle)
        ) || null;
    }

    /** Busca el país cuyo indicativo es prefijo de un número internacional ("+573001234567"). */
    function findCountryByPhone(phoneDigits) {
        const candidates = COUNTRIES
            .filter((country) => phoneDigits.startsWith(country.dial))
            .sort((a, b) => b.dial.length - a.dial.length);
        return candidates[0] || null;
    }

    FillPro.countries = { COUNTRIES, findCountry, findCountryByPhone };
})(globalThis);
