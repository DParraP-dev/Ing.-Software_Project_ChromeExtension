const API_BASE_URL = "http://localhost:3000";

const loginPanel = document.getElementById("loginPanel");
const autofillPanel = document.getElementById("autofillPanel");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const autofillButton = document.getElementById("autofillButton");
const logoutButton = document.getElementById("logoutButton");
const statusElement = document.getElementById("status");
const profileSelect = document.getElementById("profileSelect");

// Perfil activo recordado en el cliente (chrome.storage), no en la BD.
const ACTIVE_PROFILE_KEY = "activeProfileId";
// Valor especial de la opción "crear nuevo perfil" dentro del <select>.
const CREATE_OPTION_VALUE = "__create__";
// Página web donde el usuario crea/gestiona perfiles.
const PROFILE_PAGE_URL = "http://localhost:5500/pages/profile.html";

function setStatus(message = "", type = "info") {
    statusElement.textContent = message;
    statusElement.dataset.type = type;
}

function showLoggedIn(isLoggedIn) {
    loginPanel.classList.toggle("hidden", isLoggedIn);
    autofillPanel.classList.toggle("hidden", !isLoggedIn);
}

async function getStoredToken() {
    const { token } = await chrome.storage.local.get("token");
    return token || null;
}

async function clearSession() {
    await chrome.storage.local.remove("token");
    showLoggedIn(false);
}

async function requestProfile(token, profileId = null) {
    const url = profileId
        ? `${API_BASE_URL}/profile?id=${encodeURIComponent(profileId)}`
        : `${API_BASE_URL}/profile`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (response.status === 401) {
        await clearSession();
        throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
    }

    if (!response.ok) {
        throw new Error(data.error || "No fue posible obtener tu perfil.");
    }

    return data;
}

async function getActiveProfileId() {
    const stored = await chrome.storage.local.get(ACTIVE_PROFILE_KEY);
    return stored[ACTIVE_PROFILE_KEY] || null;
}

async function setActiveProfileId(id) {
    if (id) {
        await chrome.storage.local.set({ [ACTIVE_PROFILE_KEY]: String(id) });
    } else {
        await chrome.storage.local.remove(ACTIVE_PROFILE_KEY);
    }
}

// Trae la lista de perfiles del usuario (id + nombre).
async function fetchProfileList(token) {
    const response = await fetch(`${API_BASE_URL}/profile/list`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    if (response.status === 401) {
        await clearSession();
        throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
    }
    if (!response.ok) {
        throw new Error(data.error || "No fue posible obtener tus perfiles.");
    }
    return data.profiles || [];
}

// Rellena el <select> con los perfiles y, al final, el acceso rápido para crear.
function renderProfileOptions(profiles, activeId) {
    profileSelect.innerHTML = "";

    for (const profile of profiles) {
        const option = document.createElement("option");
        option.value = String(profile.id);
        option.textContent = profile.name || "Perfil sin nombre";
        profileSelect.appendChild(option);
    }

    const createOption = document.createElement("option");
    createOption.value = CREATE_OPTION_VALUE;
    createOption.textContent = "➕ Crear nuevo perfil…";
    profileSelect.appendChild(createOption);

    if (activeId && profiles.some((p) => String(p.id) === String(activeId))) {
        profileSelect.value = String(activeId);
    } else if (profiles.length > 0) {
        profileSelect.value = String(profiles[0].id);
    }
}

// Carga la lista y la pinta en el desplegable, respetando el perfil activo.
async function loadProfiles(token) {
    const profiles = await fetchProfileList(token);
    let activeId = await getActiveProfileId();

    // Si el perfil activo guardado ya no existe, cae al primero disponible.
    if (!profiles.some((p) => String(p.id) === String(activeId))) {
        activeId = profiles.length > 0 ? String(profiles[0].id) : null;
        await setActiveProfileId(activeId);
    }

    renderProfileOptions(profiles, activeId);
}

// Cambio en el desplegable: o se elige un perfil, o se abre la pantalla de creación.
profileSelect.addEventListener("change", async () => {
    const value = profileSelect.value;

    if (value === CREATE_OPTION_VALUE) {
        // Acceso rápido: lleva a la pantalla de creación de perfil en la web.
        await chrome.tabs.create({ url: PROFILE_PAGE_URL });
        const activeId = await getActiveProfileId();
        if (activeId) {
            profileSelect.value = String(activeId);
        }
        return;
    }

    await setActiveProfileId(value);
    setStatus("Perfil activo actualizado.", "success");
});

// Registra el autocompletado en el historial (HU-RF-013). Solo se envía el
// dominio de la página. Si el registro falla, el autocompletado ya se hizo,
// así que no se muestra ningún error al usuario.
async function registerAutofill(token, pageUrl, fields) {
    if (!pageUrl?.startsWith("http")) {
        return;
    }

    try {
        await fetch(`${API_BASE_URL}/logs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                website: new URL(pageUrl).hostname,
                fieldsCompleted: fields
            })
        });
    } catch (error) {
        console.warn("No se pudo registrar el autocompletado en el historial.", error);
    }
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginButton.disabled = true;
    setStatus("Conectando con FillPro...");

    try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No fue posible iniciar sesión.");
        }

        await chrome.storage.local.set({ token: data.token });
        loginForm.reset();
        showLoggedIn(true);
        setStatus("Sesión iniciada correctamente.", "success");

        try {
            await loadProfiles(data.token);
        } catch (profileError) {
            console.warn("No se pudieron cargar los perfiles.", profileError);
        }
    } catch (error) {
        setStatus(error.message || "No se pudo conectar con el servidor.", "error");
    } finally {
        loginButton.disabled = false;
    }
});

autofillButton.addEventListener("click", async () => {
    autofillButton.disabled = true;
    setStatus("Buscando campos compatibles...");

    try {
        const token = await getStoredToken();
        if (!token) {
            showLoggedIn(false);
            throw new Error("Inicia sesión para usar el autocompletado.");
        }

        const activeProfileId = await getActiveProfileId();
        const { profile, skills, accountEmail } = await requestProfile(token, activeProfileId);
        if (!profile) {
            throw new Error("Completa y guarda tu perfil antes de autocompletar.");
        }

        const [activeTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!activeTab?.id) {
            throw new Error("No se encontró una pestaña activa.");
        }

        const result = await chrome.tabs.sendMessage(activeTab.id, {
            type: "FILLPRO_AUTOFILL",
            profile,
            skills,
            accountEmail
        });

        if (!result?.ok) {
            throw new Error(result?.error || "La página no respondió al autocompletado.");
        }

        const siteLabel = result.site ? ` en ${result.site}` : "";
        const skippedLabel = result.skipped > 0
            ? ` ${result.skipped} ya tenían información y no se modificaron.`
            : "";

        if (result.filled === 0) {
            setStatus(
                `No se encontraron campos compatibles vacíos${siteLabel}.${skippedLabel}`,
                "error"
            );
            return;
        }

        setStatus(
            `Se completaron ${result.filled} campos${siteLabel}.${skippedLabel}`,
            "success"
        );
        await registerAutofill(token, activeTab.url, result.fields);
    } catch (error) {
        const message = error.message?.includes("Receiving end does not exist")
            ? "Recarga la página y vuelve a intentarlo."
            : error.message || "No fue posible autocompletar la página.";
        setStatus(message, "error");
    } finally {
        autofillButton.disabled = false;
    }
});

logoutButton.addEventListener("click", async () => {
    await clearSession();
    setStatus("Sesión cerrada.");
});

getStoredToken()
    .then(async (token) => {
        showLoggedIn(Boolean(token));
        if (token) {
            try {
                await loadProfiles(token);
            } catch (error) {
                console.warn("No se pudieron cargar los perfiles.", error);
            }
        }
    })
    .catch(() => {
        showLoggedIn(false);
        setStatus("No fue posible leer la sesión guardada.", "error");
    });

// Al cerrar sesión, olvida también el perfil activo guardado.
logoutButton.addEventListener("click", async () => {
    await setActiveProfileId(null);
});
