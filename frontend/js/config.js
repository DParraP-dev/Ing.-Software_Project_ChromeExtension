/**
 * Configuración central del frontend web de FillPro.
 *
 * Único lugar donde se define a qué backend apuntan todas las páginas
 * (login, signup, perfil, historial).
 *
 * Detecta el entorno automáticamente:
 *   - En localhost (desarrollo) usa el backend local.
 *   - En cualquier otro host (producción) usa el backend desplegado en Render.
 *
 * Este script se carga antes que los demás JS de cada página (ver los HTML
 * en frontend/pages/).
 */
(function () {
    const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    window.FILLPRO_API_BASE_URL = isLocal
        ? "http://localhost:3000"
        : "https://ing-software-project-chromeextension.onrender.com";
})();
