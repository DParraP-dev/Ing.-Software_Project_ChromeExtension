const FIELD_PATTERNS = {
    firstName: [
        "first name",
        "firstname",
        "first_name",
        "given name",
        "given-name",
        "nombre"
    ],
    lastName: [
        "last name",
        "lastname",
        "last_name",
        "family name",
        "family-name",
        "surname",
        "apellido"
    ],
    phone: [
        "phone",
        "telephone",
        "mobile",
        "cellphone",
        "contact number",
        "telefono",
        "tel"
    ],
    country: [
        "country",
        "country name",
        "country-name",
        "pais"
    ],
    city: [
        "city",
        "town",
        "address level2",
        "address-level2",
        "ciudad"
    ],
    linkedin: [
        "linkedin",
        "professional network"
    ],
    github: [
        "github",
        "code portfolio",
        "developer profile"
    ]
};

function normalizeText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getLabelText(element) {
    const texts = [];

    if (element.labels) {
        texts.push(...Array.from(element.labels, (label) => label.textContent));
    }

    const ariaLabelledBy = element.getAttribute("aria-labelledby");
    if (ariaLabelledBy) {
        for (const id of ariaLabelledBy.split(/\s+/)) {
            texts.push(document.getElementById(id)?.textContent || "");
        }
    }

    return texts.join(" ");
}

function getFieldDescription(element) {
    return normalizeText([
        element.name,
        element.id,
        element.placeholder,
        element.autocomplete,
        element.getAttribute("aria-label"),
        getLabelText(element)
    ].filter(Boolean).join(" "));
}

function findProfileKey(element) {
    const description = getFieldDescription(element);

    for (const [profileKey, patterns] of Object.entries(FIELD_PATTERNS)) {
        if (patterns.some((pattern) => description.includes(normalizeText(pattern)))) {
            return profileKey;
        }
    }

    return null;
}

function setNativeValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

    if (valueSetter) {
        valueSetter.call(element, value);
    } else {
        element.value = value;
    }
}

function fillElement(element, value) {
    if (element instanceof HTMLSelectElement) {
        const normalizedValue = normalizeText(value);
        const matchingOption = Array.from(element.options).find((option) =>
            normalizeText(option.value) === normalizedValue
            || normalizeText(option.textContent) === normalizedValue
        );

        if (!matchingOption) {
            return false;
        }

        element.value = matchingOption.value;
    } else {
        setNativeValue(element, value);
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
}

function autofillProfile(profile) {
    if (!profile || typeof profile !== "object") {
        return { filled: 0, fields: [] };
    }

    const normalizedProfile = {
        firstName: profile.firstName ?? profile.first_name,
        lastName: profile.lastName ?? profile.last_name,
        phone: profile.phone,
        country: profile.country,
        city: profile.city,
        linkedin: profile.linkedin,
        github: profile.github
    };

    const candidates = document.querySelectorAll(
        "input:not([type='hidden']):not([type='password']):not([disabled]), "
        + "textarea:not([disabled]), select:not([disabled])"
    );
    const filledFields = [];

    for (const element of candidates) {
        const profileKey = findProfileKey(element);
        const value = profileKey ? normalizedProfile[profileKey] : null;

        if (value === undefined || value === null || String(value).trim() === "") {
            continue;
        }

        if (fillElement(element, String(value))) {
            filledFields.push(profileKey);
        }
    }

    return {
        filled: filledFields.length,
        fields: [...new Set(filledFields)]
    };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "FILLPRO_AUTOFILL") {
        return false;
    }

    const result = autofillProfile(message.profile);
    sendResponse({ ok: true, ...result });
    return false;
});
