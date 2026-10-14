# 🧩 Compatibilidad con formularios reconocidos (HU-RNF-011)

FillPro reconoce los campos de formularios de **LinkedIn, Computrabajo, elempleo, Indeed, Greenhouse, Lever, Workday** y de cualquier formulario genérico que use etiquetas comunes en español o inglés.

## Arquitectura del content script

```text
extension/
├── content.js                  # Entrada: escucha FILLPRO_AUTOFILL y delega
└── src/
    ├── autofillService.js      # Orquestador (fachada)
    ├── core/                   # Lógica pura, sin DOM
    │   ├── text.js             # Normalización y comparación por tokens
    │   ├── countries.js        # País ⇄ ISO-2/ISO-3 ⇄ indicativo
    │   ├── valueSynonyms.js    # Nivel educativo y tipo de documento ⇄ textos de cada portal
    │   ├── fieldCatalog.js     # QUÉ campos existen y cómo se reconocen (palabras clave/exclusiones)
    │   ├── profileAdapter.js   # Perfil de la API → perfil canónico + formatos derivados
    │   ├── fieldMatcher.js     # Puntúa la evidencia y decide la clave de cada campo
    │   └── valueFormatter.js   # Formatea valores (fechas, números, opciones de <select>, rangos)
    ├── dom/                    # Lectura/escritura del DOM
    │   ├── fieldDescriptor.js  # Extrae label, aria, name/id, placeholder, texto cercano, sección
    │   ├── fieldScanner.js     # Recorre documento, Shadow DOM abierto e iframes same-origin
    │   └── fieldFiller.js      # Setter nativo + eventos focus/input/change/blur
    └── sites/                  # Conocimiento específico por portal (Strategy)
        ├── siteRegistry.js
        ├── linkedin.js  computrabajo.js  elempleo.js  indeed.js  ats.js
```

El orden de carga está en `manifest.json` (`content_scripts.js`). Los módulos se publican en `globalThis.FillPro`, que vive en el *isolated world* de la extensión: la página no lo ve y FillPro no registra listeners en su DOM.

## Cómo se reconoce un campo

| Evidencia | Puntos |
|-----------|--------|
| Regla del portal (selector CSS) | 1000 (definitiva) |
| `autocomplete` estándar (`given-name`, `tel`, `email`…) | 300 |
| `<label>`, `aria-label`, `aria-labelledby`, `title` | 100 |
| `name`, `id`, `data-automation-id`, `formcontrolname`… | 80 |
| Texto del contenedor (sin `<label for>`) | 70 |
| `placeholder` | 60 |

Las frases de varias palabras pesan más ("nombre de la empresa" gana a "nombre"). Las **exclusiones** descartan falsos positivos ("Nombre de la empresa" ≠ nombre del candidato, "Estado civil" ≠ departamento). Nunca se tocan buscadores, contraseñas, captchas, archivos, casillas, campos ocultos/deshabilitados/de solo lectura, ni secciones de **referencias** o **contacto de emergencia**. Los campos que ya tienen valor **no se sobrescriben**.

## Adaptación de valores

- Teléfono: completo (`+57 300…`), nacional (`3001234567`) o indicativo (`+57` / "Colombia (+57)") según el formulario o el portal.
- Nombres: completo, primer/segundo nombre, primer/segundo apellido.
- `<select>`: país por nombre/ISO, nivel educativo y tipo de documento por sinónimos, años de experiencia y salario por rangos ("3 a 5 años", "$3.500.000 - $5.000.000").
- Fechas: `AAAA-MM-DD` en `type=date`; en texto, según el placeholder (`dd/mm/aaaa`).
- URLs: `juanperez` → `https://github.com/juanperez`.

## Agregar un portal nuevo

1. Crear `extension/src/sites/<portal>.js`:

   ```js
   (function (global) {
       global.FillPro.siteRegistry.register({
           id: "miportal",
           name: "Mi Portal",
           hostPatterns: [/(^|\.)miportal\.com$/],
           scopeSelectors: [],                       // opcional: limitar a un modal/contenedor
           excludeSelectors: ["#buscador"],          // opcional: controles que nunca se tocan
           fieldRules: [{ key: "phoneNational", selectors: ["input[name='celular']"] }],
           keywordHints: { city: ["municipio"] },    // opcional: vocabulario propio
           keyAliases: { phone: "phoneNational" }    // opcional: formato que espera el portal
       });
   })(globalThis);
   ```

2. Agregarlo en `manifest.json` **después** de `siteRegistry.js` y **antes** de `autofillService.js`.
3. Agregar un caso en `tests/extension/autofill.integration.test.js`.

Un campo de perfil nuevo requiere: columna en `schema.sql` + migración, entrada en `backend/src/models/profile.fields.js`, input en `frontend/pages/profile.html` + clave en `frontend/js/profile.js`, y su definición en `fieldCatalog.js` (y en `profileAdapter.js`).

## Limitaciones conocidas

- Iframes de **otro origen** (algunos ATS embebidos) no son accesibles desde el documento principal.
- Los *typeahead* (ciudad en LinkedIn) reciben el texto, pero el usuario debe elegir la sugerencia.
- Listas desplegables personalizadas que no son `<select>` nativos, radios y casillas no se completan.
- Las reglas por selector de cada portal se basan en patrones públicos conocidos; si un portal cambia su HTML, el motor genérico sigue funcionando con las etiquetas.
