/**
 * Catálogo de campos reconocidos (HU-RNF-011).
 *
 * Cada definición describe CÓMO se reconoce un dato del perfil en un
 * formulario cualquiera, independientemente del portal:
 *
 *  - key:          clave del perfil canónico (FillPro.profileAdapter).
 *  - kinds:        tipos de control donde tiene sentido escribir el dato.
 *  - autocomplete: tokens estándar HTML (https://html.spec.whatwg.org/#autofill).
 *  - keywords:     frases (es/en) que aparecen en label, aria-label, name, id,
 *                  placeholder... Las frases con más palabras pesan más.
 *  - exclude:      frases que, si aparecen JUNTO a la palabra clave, indican
 *                  que el campo es otra cosa ("Nombre de la empresa").
 *  - typeBonus:    puntos extra si el input tiene ese `type` (email, tel...).
 *
 * El orden importa solo para desempatar: las definiciones más específicas
 * van antes. Las particularidades de cada portal NO van aquí, sino en
 * src/sites/*.js.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});

    const TEXT = ["text", "textarea"];
    const TEXT_OR_SELECT = ["text", "textarea", "select"];
    const LINK = ["url", "text"];
    const NUMERIC = ["number", "text", "select"];

    /** Palabras que indican que un "Nombre"/"Apellido" no es el del candidato. */
    const NOT_A_PERSON_NAME = [
        "company", "empresa", "organization", "organizacion", "employer", "empleador",
        "user", "usuario", "username", "file", "archivo", "reference", "referencia",
        "referido", "referral", "emergency", "emergencia", "school", "institution",
        "institucion", "universidad", "university", "colegio", "job", "position", "cargo",
        "puesto", "title", "titulo", "manager", "jefe", "supervisor", "father", "mother",
        "padre", "madre", "spouse", "conyuge", "card", "tarjeta", "account", "cuenta",
        "project", "proyecto", "pet", "mascota", "course", "curso", "degree", "carrera",
        "program", "programa", "contact", "contacto", "recruiter", "reclutador", "street",
        "calle", "city", "ciudad", "country", "pais", "bank", "banco", "brand", "marca",
        "product", "producto", "role", "rol", "certification", "certificacion", "skill",
        "habilidad", "language", "idioma", "event", "evento", "team", "equipo"
    ];

    const PERSON_RELATIVES = ["father", "mother", "padre", "madre", "spouse", "conyuge", "reference", "referencia", "emergency", "emergencia"];
    const DATE_WORDS = ["start", "end", "inicio", "fin", "fecha", "date", "desde", "hasta"];

    const FIELD_DEFINITIONS = [
        // ---------- Nombres ----------
        {
            key: "fullName",
            kinds: TEXT,
            autocomplete: ["name"],
            keywords: [
                "full name", "fullname", "nombre completo", "nombres completos", "nombres y apellidos",
                "nombre y apellido", "apellidos y nombres", "your name", "candidate name",
                "nombre del candidato", "legal name", "name"
            ],
            exclude: [
                ...NOT_A_PERSON_NAME, "first", "last", "given", "family", "middle", "surname",
                "apellido", "primer", "segundo", "nick", "apodo", "display", "preferred"
            ]
        },
        {
            key: "firstGivenName",
            kinds: TEXT,
            keywords: ["primer nombre", "first given name"],
            exclude: [...NOT_A_PERSON_NAME, "apellido", "surname"]
        },
        {
            key: "middleName",
            kinds: TEXT,
            autocomplete: ["additional-name"],
            keywords: ["middle name", "middlename", "segundo nombre", "otros nombres", "second name"],
            exclude: [...NOT_A_PERSON_NAME, "apellido", "surname", "last"]
        },
        {
            key: "firstName",
            kinds: TEXT,
            autocomplete: ["given-name"],
            keywords: ["first name", "firstname", "fname", "given name", "forename", "nombre", "nombres", "name first"],
            exclude: [
                ...NOT_A_PERSON_NAME, "last", "family", "surname", "apellido", "middle", "segundo",
                "full", "completo", "completos", "primer", "nick", "apodo", "display", "preferred"
            ]
        },
        {
            key: "firstSurname",
            kinds: TEXT,
            keywords: ["primer apellido", "apellido paterno", "first surname", "first last name", "paternal surname"],
            exclude: [...NOT_A_PERSON_NAME]
        },
        {
            key: "secondSurname",
            kinds: TEXT,
            keywords: ["segundo apellido", "apellido materno", "second surname", "second last name", "maternal surname"],
            exclude: [...NOT_A_PERSON_NAME]
        },
        {
            key: "lastName",
            kinds: TEXT,
            autocomplete: ["family-name"],
            keywords: ["last name", "lastname", "lname", "family name", "surname", "apellido", "apellidos", "name last"],
            exclude: [
                ...NOT_A_PERSON_NAME, "first", "given", "primer", "segundo", "paterno", "materno",
                "second", "middle", "nombre", "nombres", "full", "completo"
            ]
        },

        // ---------- Contacto ----------
        {
            key: "email",
            kinds: ["email", "text", "select"],
            autocomplete: ["email"],
            typeBonus: { email: 150 },
            keywords: [
                "email", "e mail", "email address", "correo", "correo electronico", "mail",
                "direccion de correo", "direccion de correo electronico", "your email"
            ],
            exclude: [
                "password", "contrasena", "referral", "referido", "reference", "referencia",
                "recruiter", "reclutador", "manager", "jefe", "emergency", "emergencia", "company", "empresa"
            ]
        },
        {
            key: "phoneCountryCode",
            kinds: ["select", "text", "tel"],
            autocomplete: ["tel-country-code"],
            keywords: [
                "country code", "phone country code", "phone number country", "phone country",
                "codigo de pais", "codigo pais", "codigo del pais", "indicativo", "indicativo del pais",
                "prefijo", "prefijo telefonico", "dial code", "calling code", "country calling code"
            ],
            exclude: ["postal", "zip", "area"]
        },
        {
            key: "phoneNational",
            kinds: ["tel", "text", "number"],
            autocomplete: ["tel-national"],
            keywords: [
                "national number", "nationalnumber", "numero nacional", "numero local", "local number",
                "phone without country code", "numero sin indicativo", "telefono sin indicativo",
                "subscriber number"
            ],
            exclude: ["emergency", "emergencia", "reference", "referencia"]
        },
        {
            key: "phone",
            kinds: ["tel", "text", "number"],
            autocomplete: ["tel"],
            typeBonus: { tel: 120 },
            keywords: [
                "phone", "phone number", "telephone", "telephone number", "telefono", "numero de telefono",
                "tel", "mobile", "mobile phone", "mobile phone number", "mobile number", "cell", "cellphone",
                "cell phone", "celular", "numero de celular", "telefono celular", "movil", "telefono movil",
                "whatsapp", "contact number", "numero de contacto", "telefono de contacto"
            ],
            exclude: [
                "country", "pais", "country code", "codigo", "indicativo", "prefijo", "dial", "extension",
                "ext", "fax", "emergency", "emergencia", "reference", "referencia", "referido", "type",
                "tipo", "device", "dispositivo", "company", "empresa", "jefe", "manager"
            ]
        },

        // ---------- Identificación ----------
        {
            key: "documentType",
            kinds: ["select", "text"],
            keywords: [
                "document type", "tipo de documento", "tipo documento", "tipo de identificacion",
                "tipo identificacion", "id type", "identification type", "type of id",
                "tipo de documento de identidad", "tipo doc"
            ],
            exclude: [...PERSON_RELATIVES]
        },
        {
            key: "documentNumber",
            kinds: ["text", "number", "tel"],
            keywords: [
                "document number", "numero de documento", "numero documento", "nro documento",
                "no documento", "documento", "documento de identidad", "numero de identificacion",
                "identificacion", "cedula", "numero de cedula", "dni", "rut", "curp", "id number",
                "national id", "identification number", "passport number", "numero de pasaporte"
            ],
            exclude: [
                ...PERSON_RELATIVES, "type", "tipo", "date", "fecha", "expedicion", "issue", "issued",
                "city", "ciudad", "lugar", "place", "country", "pais", "file", "archivo", "attach",
                "adjunta", "adjuntar", "upload", "subir", "cargar", "foto", "photo", "scan", "copia"
            ]
        },
        {
            key: "birthDate",
            kinds: ["date", "text"],
            autocomplete: ["bday"],
            keywords: [
                "birth date", "birthdate", "date of birth", "fecha de nacimiento", "fecha nacimiento",
                "nacimiento", "birthday", "dob", "cumpleanos"
            ],
            exclude: ["city", "ciudad", "place", "lugar", "country", "pais", "municipio", "departamento", ...PERSON_RELATIVES]
        },

        // ---------- Ubicación ----------
        {
            key: "postalCode",
            kinds: ["text", "number"],
            autocomplete: ["postal-code"],
            keywords: ["postal code", "postcode", "zip", "zip code", "zipcode", "codigo postal", "cp"],
            exclude: []
        },
        {
            key: "address",
            kinds: TEXT,
            autocomplete: ["street-address", "address-line1"],
            keywords: [
                "address", "street address", "address line", "address line 1", "address 1", "direccion",
                "direccion de residencia", "direccion residencia", "domicilio", "calle", "street"
            ],
            exclude: [
                "email", "e mail", "correo", "mail", "web", "url", "ip", "line 2", "address line 2",
                "address 2", "linea 2", "complemento", "city", "ciudad", "country", "pais", "postal",
                "zip", "company", "empresa", "billing", "facturacion", "wallet"
            ]
        },
        {
            key: "country",
            kinds: TEXT_OR_SELECT,
            autocomplete: ["country-name", "country"],
            keywords: [
                "country", "pais", "country of residence", "pais de residencia", "pais residencia",
                "residence country", "country region"
            ],
            exclude: [
                "code", "codigo", "indicativo", "prefijo", "phone", "telefono", "dial", "calling",
                "birth", "nacimiento", "nationality", "nacionalidad", "issued", "issue", "expedicion",
                "emision", "visa", "citizenship", "ciudadania", "company", "empresa", "desired", "deseado"
            ]
        },
        {
            key: "state",
            kinds: TEXT_OR_SELECT,
            autocomplete: ["address-level1"],
            keywords: [
                "state", "province", "provincia", "departamento", "region", "estado", "state province",
                "state or province", "departamento de residencia", "address level1"
            ],
            exclude: [
                "status", "civil", "marital", "birth", "nacimiento", "work", "laboral", "employment",
                "empleo", "postulacion", "application", "solicitud", "expedicion", "issued", "area", "company", "empresa"
            ]
        },
        {
            key: "city",
            kinds: TEXT_OR_SELECT,
            autocomplete: ["address-level2"],
            keywords: [
                "city", "ciudad", "town", "municipio", "localidad", "locality", "comuna",
                "city of residence", "ciudad de residencia", "ciudad residencia", "address level2"
            ],
            exclude: [
                "birth", "nacimiento", "expedicion", "issued", "issue", "desired", "deseada", "preferred",
                "preferida", "company", "empresa", "job", "trabajo", "office", "oficina"
            ]
        },
        {
            key: "location",
            kinds: TEXT,
            keywords: [
                "location", "current location", "ubicacion", "ubicacion actual", "where are you based",
                "lugar de residencia", "residencia", "residence", "location city"
            ],
            exclude: [
                "preferred", "preferida", "desired", "deseada", "job", "work", "trabajo", "office",
                "oficina", "company", "empresa", "relocate", "reubicacion", "remote"
            ]
        },

        // ---------- Perfil profesional ----------
        {
            key: "headline",
            kinds: TEXT,
            keywords: [
                "headline", "professional headline", "titular", "titular profesional", "tagline",
                "titulo del perfil", "titulo de tu cv", "titulo del cv", "titulo de la hoja de vida"
            ],
            exclude: ["company", "empresa", "job", "oferta", "cuenta", "account", "tarjeta", "card"]
        },
        {
            key: "summary",
            kinds: ["textarea", "text"],
            keywords: [
                "summary", "professional summary", "resumen", "resumen profesional", "about", "about me",
                "about you", "acerca de mi", "sobre mi", "perfil profesional", "descripcion profesional",
                "descripcion del perfil", "bio", "biography", "presentacion", "tell us about yourself",
                "cuentanos sobre ti", "describete"
            ],
            exclude: [
                "company", "empresa", "job", "cargo", "puesto", "position", "role", "project", "proyecto",
                "hear", "heard", "us", "enteraste", "conociste", "nosotros"
            ]
        },
        {
            key: "salaryExpectation",
            kinds: NUMERIC,
            keywords: [
                "salary", "salario", "expected salary", "salary expectation", "desired salary", "desired pay",
                "aspiracion salarial", "pretension salarial", "pretensiones salariales", "expectativa salarial",
                "salario esperado", "salario deseado", "sueldo", "sueldo deseado", "sueldo pretendido",
                "remuneracion", "compensation", "expected compensation"
            ],
            exclude: ["current", "actual", "currency", "moneda", "divisa", "type", "tipo", "frequency", "periodicidad", "period", "periodo"]
        },
        {
            key: "yearsExperience",
            kinds: NUMERIC,
            keywords: [
                "years of experience", "years experience", "total experience", "work experience",
                "experience", "anos de experiencia", "anos experiencia", "experiencia",
                "experiencia laboral", "tiempo de experiencia", "how many years"
            ],
            exclude: [
                "description", "descripcion", "describe", "detalle", "details", "company", "empresa",
                "summary", "resumen", "with", "using", "con", "utilizando", "manejando", "level", "nivel"
            ]
        },
        {
            key: "currentTitle",
            kinds: TEXT,
            autocomplete: ["organization-title"],
            keywords: [
                "job title", "current title", "current job title", "title", "cargo", "cargo actual",
                "ultimo cargo", "cargo mas reciente", "puesto", "puesto actual", "position",
                "current position", "role", "current role", "ocupacion", "occupation", "designation",
                "titulo del cargo", "nombre del cargo"
            ],
            exclude: [
                "desired", "deseado", "aspira", "aspiras", "preferred", "applying", "postula", "postulas",
                "vacante", "interes", "interest", "salary", "salario", "manager", "jefe", "reference",
                "referencia", "description", "descripcion", "level", "nivel", "funciones",
                "responsibilities", "salutation", "tratamiento", "degree", "academic", "academico",
                "school", "education", ...DATE_WORDS
            ]
        },
        {
            key: "currentCompany",
            kinds: TEXT,
            autocomplete: ["organization"],
            keywords: [
                "company", "current company", "company name", "employer", "current employer", "empresa",
                "empresa actual", "ultima empresa", "nombre de la empresa", "organization", "organizacion",
                "org", "compania", "empleador"
            ],
            exclude: [
                "desired", "website", "web", "url", "size", "tamano", "industry", "sector", "type", "tipo",
                "email", "correo", "phone", "telefono", "reference", "referencia", "contact", "contacto",
                "city", "ciudad", "country", "pais", "address", "direccion", "description", "descripcion",
                ...DATE_WORDS
            ]
        },

        // ---------- Educación ----------
        {
            key: "educationLevel",
            kinds: ["select", "text"],
            keywords: [
                "education level", "level of education", "highest education", "highest level of education",
                "nivel de estudios", "nivel educativo", "nivel academico", "nivel de educacion",
                "maximo nivel de estudios", "ultimo nivel de estudios", "grado academico",
                "formacion academica", "degree", "estudios", "education"
            ],
            exclude: [
                "institution", "institucion", "school", "universidad", "university", "field", "area",
                "major", "carrera", "title", "titulo", "status", "estado", "city", "ciudad", "country",
                "pais", "description", "descripcion", "name", "nombre", "year", "ano", ...DATE_WORDS
            ]
        },
        {
            key: "graduationYear",
            kinds: NUMERIC,
            keywords: [
                "graduation year", "year of graduation", "graduation date", "completion year", "end year",
                "ano de graduacion", "ano de grado", "ano de finalizacion", "ano de egreso", "egreso",
                "fecha de graduacion", "fecha de grado"
            ],
            exclude: ["start", "inicio"]
        },
        {
            key: "institution",
            kinds: TEXT,
            keywords: [
                "school", "school name", "institution", "institucion", "institucion educativa",
                "nombre de la institucion", "universidad", "university", "college", "centro educativo",
                "centro de estudios", "entidad educativa", "colegio"
            ],
            exclude: [
                "city", "ciudad", "country", "pais", "type", "tipo", "level", "nivel", "address",
                "direccion", "year", "ano", ...DATE_WORDS
            ]
        },
        {
            key: "fieldOfStudy",
            kinds: TEXT,
            keywords: [
                "field of study", "area of study", "major", "discipline", "degree name", "area de estudio",
                "area de estudios", "carrera", "programa academico", "titulo obtenido", "titulo academico",
                "profesion", "especialidad", "titulo", "study"
            ],
            exclude: [
                "level", "nivel", "status", "estado", "institution", "institucion", "universidad",
                "school", "job", "cargo", "puesto", "position", "salutation", "cv", "hoja de vida",
                "resume", "file", "archivo", "attach", "adjunta", "perfil", "year", "ano", ...DATE_WORDS
            ]
        },
        {
            key: "languages",
            kinds: TEXT,
            keywords: ["languages", "language", "idiomas", "idioma", "lenguas", "language skills", "languages spoken"],
            exclude: ["preferred", "preferido", "programming", "programacion", "level", "nivel", "interface", "site", "sitio"]
        },
        {
            key: "skills",
            kinds: TEXT,
            keywords: [
                "skills", "key skills", "habilidades", "conocimientos", "aptitudes", "competencias",
                "tecnologias", "technologies", "herramientas", "tools", "tech stack"
            ],
            exclude: ["level", "nivel", "years", "anos"]
        },

        // ---------- Enlaces ----------
        {
            key: "linkedin",
            kinds: LINK,
            keywords: ["linkedin", "linkedin profile", "linkedin url", "perfil de linkedin", "professional network"],
            exclude: []
        },
        {
            key: "github",
            kinds: LINK,
            keywords: ["github", "github profile", "github url", "code portfolio", "repositorio", "repository"],
            exclude: []
        },
        {
            key: "portfolio",
            kinds: LINK,
            autocomplete: ["url"],
            keywords: [
                "portfolio", "portafolio", "website", "web site", "personal website", "personal site",
                "sitio web", "pagina web", "blog", "url", "web"
            ],
            exclude: [
                "linkedin", "github", "company", "empresa", "facebook", "twitter", "instagram",
                "tiktok", "job", "oferta", "posting", "referral", "referido"
            ]
        }
    ];

    /**
     * Si estas frases aparecen en cualquier fuente principal, el campo no se
     * toca (buscadores, contraseñas, captchas, honeypots anti-bots...).
     */
    const GLOBAL_EXCLUDE = [
        "search", "buscar", "busqueda", "busca", "password", "contrasena", "captcha", "coupon",
        "cupon", "promo", "card number", "numero de tarjeta", "cvv", "cvc", "otp",
        "verification code", "codigo de verificacion", "keyword", "palabra clave", "query",
        "filter", "filtro", "honeypot", "leave blank", "dejar vacio", "dejar en blanco"
    ];

    /** Si la sección/encabezado del campo contiene esto, no es un dato del candidato. */
    const SECTION_EXCLUDE = [
        "reference", "referencia", "referencias personales", "referencias laborales", "referido",
        "referral", "emergency", "emergencia", "contacto de emergencia", "emergency contact"
    ];

    FillPro.fieldCatalog = {
        FIELD_DEFINITIONS,
        GLOBAL_EXCLUDE,
        SECTION_EXCLUDE,
        getDefinition(key) {
            return FIELD_DEFINITIONS.find((definition) => definition.key === key) || null;
        }
    };
})(globalThis);
