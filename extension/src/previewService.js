/**
 * Vista previa y confirmación sobre el motor modular de FillPro.
 * Mantiene referencias al documento revisado; nunca busca un reemplazo por id.
 */
(function (global) {
    "use strict";

    const FillPro = (global.FillPro = global.FillPro || {});
    let currentPreview = null;
    let sequence = 0;

    function readValue(element) {
        return element.tagName === "SELECT" ? String(element.selectedIndex) : String(element.value ?? "");
    }

    function readOptions(element) {
        return FillPro.fieldFiller.readOptions(element).map((option) => ({
            ...option,
            disabled: option.disabled || Boolean(element.options[option.index].parentElement?.disabled)
        }));
    }

    function parentOf(element) {
        return FillPro.fieldDescriptor.parentOf(element) || element.ownerDocument?.defaultView?.frameElement || null;
    }

    function isEligible(element) {
        if (!element.isConnected || !FillPro.fieldScanner.isFillable(element)
            || element.matches(":disabled") || element.getAttribute("aria-readonly") === "true") return false;
        const autocomplete = String(element.getAttribute("autocomplete") || "").toLowerCase().split(/\s+/);
        if (autocomplete.some((token) => /^(?:.*password|one-time-code|cc-.*)$/.test(token))) return false;

        for (let current = element; current; current = parentOf(current)) {
            if (!current.isConnected || current.hidden || current.hasAttribute("inert")
                || current.getAttribute("aria-hidden") === "true"
                || current.getAttribute("aria-disabled") === "true") return false;
            const view = current.ownerDocument?.defaultView;
            const style = view?.getComputedStyle(current);
            if (style && (style.display === "none" || style.visibility === "hidden"
                || style.visibility === "collapse" || style.opacity === "0"
                || style.contentVisibility === "hidden")) return false;
            // Layoutless wrappers (display:contents) can contain visible controls.
            if ((current === element || current.tagName === "IFRAME" || current.tagName === "FRAME")
                && typeof current.checkVisibility === "function"
                && !current.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
        }
        return true;
    }

    // Includes the document chain of same-origin frames and the shadow root identity.
    function contextOf(element, topDocument) {
        const contexts = [];
        let document = element.ownerDocument;
        let current = element;
        while (document) {
            const frame = document.defaultView?.frameElement || null;
            contexts.push({ document, href: document.location?.href, root: current.getRootNode(), frame });
            if (document === topDocument) return contexts;
            if (!frame?.isConnected || frame.contentDocument !== document) return null;
            current = frame;
            document = frame.ownerDocument;
        }
        return null;
    }

    function sameContext(first, second) {
        return first && second && first.length === second.length && first.every((entry, index) =>
            Object.keys(entry).every((key) => entry[key] === second[index][key]));
    }

    function fingerprint(element) {
        return JSON.stringify({
            descriptor: FillPro.fieldDescriptor.describe(element),
            constraints: ["min", "max", "step", "pattern", "required", "minlength", "maxlength", "multiple"]
                .map((name) => element.getAttribute(name)),
            options: element.tagName === "SELECT" ? readOptions(element) : null
        });
    }

    function labelOf(match) {
        const sources = match.descriptor.sources;
        return [...(sources.label || []), ...(sources.ariaLabel || []), ...(sources.nearbyLabel || [])]
            .filter(Boolean).join(" ") || match.element.name || match.element.id || match.key;
    }

    function isExcluded(descriptor) {
        const { tokenize, compact, findPhrase } = FillPro.text;
        const contains = (texts, phrases) => texts.some((text) =>
            phrases.some((phrase) => findPhrase(tokenize(text), compact(phrase)) !== null));
        const primary = Object.entries(descriptor.sources).filter(([key]) => key !== "section")
            .flatMap(([, texts]) => texts);
        // Portal selectors cannot override exclusions for passwords, searches or other people's data.
        return contains(primary, FillPro.fieldCatalog.GLOBAL_EXCLUDE)
            || contains(descriptor.sources.section || [], FillPro.fieldCatalog.SECTION_EXCLUDE);
    }

    function create(payload, options = {}) {
        currentPreview = null;
        if (!payload?.profile || typeof payload.profile !== "object" || Array.isArray(payload.profile)) {
            return { ok: false, error: "No se pudo leer tu perfil. Vuelve a intentarlo." };
        }
        const document = options.document || global.document;
        const { profile, site, matches } = FillPro.autofillService.scan(payload, { ...options, document });
        const previewId = String(Date.now()) + "-" + (++sequence);
        const targets = new Map();
        const fields = [];

        for (const match of matches) {
            const { element, descriptor, key } = match;
            if (!isEligible(element) || isExcluded(descriptor)) continue;
            const context = contextOf(element, document);
            if (!context) continue;
            const id = "field-" + (fields.length + 1);
            const currentValue = readValue(element);
            const type = descriptor.kind;
            let value;
            let fieldOptions;
            let currentLabel;
            if (type === "select") {
                const choices = readOptions(element);
                const index = FillPro.valueFormatter.chooseOption(key, profile, choices);
                value = index >= 0 ? String(index) : "";
                fieldOptions = choices.filter((option) => !FillPro.valueFormatter.isPlaceholderOption(option))
                    .map((option) => ({ value: String(option.index),
                        label: element.options[option.index].label || option.text || option.value }));
                const selectedOption = element.options[element.selectedIndex];
                currentLabel = selectedOption?.label || selectedOption?.textContent || "";
            } else {
                value = FillPro.valueFormatter.formatInputValue(key, profile, descriptor) ?? "";
            }
            const label = labelOf(match);
            targets.set(id, { element, key, label, currentValue, context, form: element.form,
                fingerprint: fingerprint(element) });
            fields.push({ id, profileKey: key, label, value, currentValue, type,
                selected: !FillPro.fieldFiller.hasUserValue(element),
                ...(fieldOptions ? { options: fieldOptions, currentLabel } : {}) });
        }
        currentPreview = { id: previewId, document, href: document.location?.href, site, targets };
        return { ok: true, previewId, fields, site: site?.name ?? null };
    }

    function stale(filled = 0) {
        currentPreview = null;
        return {
            ok: false, stale: true, filled,
            error: filled > 0
                ? "La página cambió después de completar " + filled + " campos. Revisa el formulario y vuelve a previsualizar."
                : "El formulario cambió. Genera una nueva vista previa antes de autocompletar."
        };
    }

    function targetUnchanged(target, preview, eligible) {
        const { element } = target;
        return preview.document.location?.href === preview.href
            && (!eligible || eligible.has(element)) && isEligible(element)
            && readValue(element) === target.currentValue && element.form === target.form
            && sameContext(target.context, contextOf(element, preview.document))
            && fingerprint(element) === target.fingerprint;
    }

    function validValue(element, value) {
        if (element.tagName === "SELECT") {
            return readOptions(element).some((option) => !FillPro.valueFormatter.isPlaceholderOption(option)
                && String(option.index) === value);
        }
        // A detached probe validates native date/number/email/url semantics without page writes/events.
        const probe = element.cloneNode(false);
        FillPro.fieldFiller.setNativeValue(probe, value);
        const maxLength = Number(element.getAttribute("maxlength"));
        const minLength = Number(element.getAttribute("minlength"));
        return probe.value === value && probe.validity.valid
            && (!element.hasAttribute("maxlength") || maxLength < 0 || value.length <= maxLength)
            && (!element.hasAttribute("minlength") || minLength <= 0 || value.length >= minLength);
    }

    function apply(message) {
        const preview = currentPreview;
        if (!preview || message?.previewId !== preview.id || preview.document.location?.href !== preview.href) return stale();
        if (!Array.isArray(message.fields)) return { ok: false, error: "Selecciona los campos que quieres completar." };
        const seen = new Set();
        const changes = [];
        const eligible = new Set(FillPro.fieldScanner.collect(preview.document, preview.site));

        for (const field of message.fields) {
            if (!field || typeof field.id !== "string" || typeof field.value !== "string" || seen.has(field.id)) {
                return { ok: false, error: "La selección no es válida. Genera una nueva vista previa." };
            }
            seen.add(field.id);
            const target = preview.targets.get(field.id);
            if (!target || !targetUnchanged(target, preview, eligible)) return stale();
            if (!field.value.trim()) continue;
            if (!validValue(target.element, field.value)) {
                return { ok: false, error: "Revisa el valor de «" + target.label + "»: no cumple el formato de este campo." };
            }
            if (field.value !== target.currentValue) changes.push({ ...target, value: field.value });
        }

        currentPreview = null;
        const filledKeys = [];
        let filled = 0;
        let skipped = 0;
        for (let index = 0; index < changes.length; index++) {
            const target = changes[index];
            // Also revalidate remaining targets after focus handlers, before the first actual write.
            const canWrite = () => {
                const candidates = new Set(FillPro.fieldScanner.collect(preview.document, preview.site));
                return changes.slice(index).every((pending) => targetUnchanged(pending, preview, candidates));
            };
            if (!canWrite()) return stale(filled);
            let changedDuringFocus = false;
            const options = { overwrite: true, beforeWrite: () => {
                changedDuringFocus = !canWrite();
                return !changedDuringFocus;
            } };
            const status = target.element.tagName === "SELECT"
                ? FillPro.fieldFiller.fillSelect(target.element, Number(target.value), options)
                : FillPro.fieldFiller.fillText(target.element, target.value, options);
            if (changedDuringFocus) return stale(filled);
            if (status === "filled") {
                filled++;
                filledKeys.push(target.key);
            } else if (status === "skipped") {
                skipped++;
            }
        }
        return { ok: true, filled, fields: [...new Set(filledKeys)], skipped, site: preview.site?.name ?? null };
    }

    FillPro.previewService = { create, apply };
})(globalThis);
