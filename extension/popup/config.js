/**
 * Configuración central del popup de FillPro.
 *
 * Único lugar donde se define a qué backend apunta la extensión y dónde vive
 * la página web de gestión de perfiles. Para desplegar a producción solo hay
 * que cambiar estos valores aquí (y la URL del backend en manifest.json ->
 * host_permissions, que Chrome exige de forma declarativa y no puede leer
 * desde este archivo).
 *
 * La extensión apunta a los servicios desplegados en Render. Para probar
 * contra un backend local, cambia temporalmente API_BASE_URL a
 * "http://localhost:3000" y PROFILE_PAGE_URL a tu frontend local.
 *
 * Este script se carga antes que popup.js (ver popup.html).
 */
(function (global) {
    "use strict";

    global.FILLPRO_CONFIG = {
        // Backend (API REST) desplegado en Render.
        API_BASE_URL: "https://ing-software-project-chromeextension.onrender.com",
        // Página web (frontend en Render) donde el usuario crea/gestiona perfiles.
        PROFILE_PAGE_URL: "https://ing-software-project-chromeextension-h8gx.onrender.com/pages/profile.html"
    };
})(globalThis);
