/**
 * Configuración central del frontend web de FillPro.
 *
 * Único lugar donde se define a qué backend apuntan todas las páginas
 * (login, signup, perfil, historial). Para desplegar a producción solo hay
 * que cambiar API_BASE_URL aquí.
 *
 * Este script se carga antes que los demás JS de cada página (ver los HTML
 * en frontend/pages/).
 */
window.FILLPRO_API_BASE_URL = "http://localhost:3000";
