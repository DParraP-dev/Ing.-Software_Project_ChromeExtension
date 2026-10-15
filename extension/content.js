/**
 * Content script de FillPro (punto de entrada).
 *
 * Escucha solicitudes de vista previa, confirmación y borrado del popup.
 * Los módulos de src/ se cargan antes que este archivo (ver manifest.json)
 * y viven en el "isolated world" de la extensión: no comparten variables
 * con los scripts de la página ni registran listeners sobre su DOM.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!["FILLPRO_PREVIEW", "FILLPRO_APPLY_PREVIEW", "FILLPRO_CLEAR_AUTOFILL", "FILLPRO_AUTOFILL"].includes(message?.type)) {
        return false;
    }

    try {
        if (message.type === "FILLPRO_PREVIEW") {
            sendResponse(globalThis.FillPro.previewService.create({
                profile: message.profile, skills: message.skills, accountEmail: message.accountEmail
            }));
        } else if (message.type === "FILLPRO_APPLY_PREVIEW") {
            sendResponse(globalThis.FillPro.previewService.apply(message));
        } else if (message.type === "FILLPRO_CLEAR_AUTOFILL") {
            sendResponse(globalThis.FillPro.previewService.clear());
        } else {
            sendResponse({ ok: false, error: "Recarga FillPro y revisa la vista previa antes de autocompletar." });
        }
    } catch (error) {
        console.error("[FillPro] Error al autocompletar", error);
        sendResponse({ ok: false, error: error?.message || "Error inesperado" });
    }

    return false;
});
