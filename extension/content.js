/**
 * Content script de FillPro (punto de entrada).
 *
 * Solo escucha el mensaje del popup y delega en FillPro.autofillService.
 * Los módulos de src/ se cargan antes que este archivo (ver manifest.json)
 * y viven en el "isolated world" de la extensión: no comparten variables
 * con los scripts de la página ni registran listeners sobre su DOM.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "FILLPRO_AUTOFILL") {
        return false;
    }

    try {
        const result = globalThis.FillPro.autofillService.run({
            profile: message.profile,
            skills: message.skills,
            accountEmail: message.accountEmail
        }, {
            overwrite: Boolean(message.overwrite)
        });
        sendResponse({ ok: true, ...result });
    } catch (error) {
        console.error("[FillPro] Error al autocompletar", error);
        sendResponse({ ok: false, error: error?.message || "Error inesperado" });
    }

    return false;
});
