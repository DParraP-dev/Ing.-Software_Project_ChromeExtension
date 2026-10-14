/**
 * Equivalencias de valores entre FillPro y los portales. Se usan para elegir
 * la opción correcta de un <select>: el perfil guarda "universitario", pero
 * LinkedIn muestra "Bachelor's Degree" y Computrabajo "Universitario".
 *
 * Para soportar un valor nuevo basta con agregar sinónimos aquí.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    const EDUCATION_LEVELS = {
        bachillerato: [
            "bachillerato", "bachiller", "secundaria", "educacion secundaria", "educacion media",
            "high school", "high school diploma", "secondary school", "secondary", "preparatoria",
            "ensenanza media"
        ],
        tecnico: [
            "tecnico", "tecnica", "tecnico profesional", "tecnico laboral", "formacion tecnica",
            "technical", "technical degree", "vocational"
        ],
        tecnologo: [
            "tecnologo", "tecnologia", "tecnologica", "tecnologo profesional", "tecnico superior",
            "associate degree", "associates degree", "associate"
        ],
        universitario: [
            "universitario", "universitaria", "universidad", "pregrado", "profesional",
            "licenciatura", "carrera universitaria", "grado", "bachelor", "bachelors",
            "bachelor s degree", "bachelors degree", "undergraduate", "university degree"
        ],
        especializacion: [
            "especializacion", "especialista", "especialidad", "posgrado", "postgrado",
            "postgraduate", "postgraduate diploma"
        ],
        maestria: [
            "maestria", "magister", "master", "masters", "master s degree", "masters degree", "mba", "msc"
        ],
        doctorado: ["doctorado", "doctorate", "phd", "ph d", "doctoral", "doctor"]
    };

    const DOCUMENT_TYPES = {
        CC: ["cedula de ciudadania", "cedula ciudadania", "cedula", "cc", "c c"],
        CE: ["cedula de extranjeria", "cedula extranjeria", "ce", "c e"],
        TI: ["tarjeta de identidad", "ti", "t i"],
        PA: ["pasaporte", "passport", "pa", "pas"],
        PPT: ["permiso por proteccion temporal", "permiso de proteccion temporal", "ppt"],
        DNI: ["documento nacional de identidad", "dni"],
        RUT: ["rol unico tributario", "rut", "run"],
        CURP: ["curp"],
        OTRO: ["otro", "otros", "other"]
    };

    function lookup(table, value) {
        if (!value) {
            return [];
        }
        const { normalizeText } = FillPro.text;
        const normalized = normalizeText(value);
        const entry = Object.entries(table).find(([canonical]) => normalizeText(canonical) === normalized);
        return entry ? entry[1] : [];
    }

    FillPro.valueSynonyms = {
        EDUCATION_LEVELS,
        DOCUMENT_TYPES,
        educationLevel: (value) => lookup(EDUCATION_LEVELS, value),
        documentType: (value) => lookup(DOCUMENT_TYPES, value)
    };
})(globalThis);
