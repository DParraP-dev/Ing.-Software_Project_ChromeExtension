/**
 * Configuración central del popup de FillPro.
 *
 * Único lugar donde se define a qué backend apunta la extensión y dónde vive
 * la página web de gestión de perfiles. Para desplegar a producción solo hay
 * que cambiar estos valores aquí (y la URL del backend en manifest.json ->
 * host_permissions, que Chrome exige de forma declarativa y no puede leer
 * desde este archivo).
 *
 * Este script se carga antes que popup.js (ver popup.html).
 */
(function (global) {
    "use strict";

    global.FILLPRO_CONFIG = {
        // Backend (API REST). En desarrollo: http://localhost:3000
        API_BASE_URL: "http://localhost:3000",
        // Página web donde el usuario crea/gestiona perfiles.
        PROFILE_PAGE_URL: "http://localhost:5500/pages/profile.html"
    };
})(globalThis);
