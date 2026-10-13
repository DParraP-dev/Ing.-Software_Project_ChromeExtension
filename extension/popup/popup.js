const API_BASE_URL = "http://localhost:3000";

const loginPanel = document.getElementById("loginPanel");
const autofillPanel = document.getElementById("autofillPanel");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const autofillButton = document.getElementById("autofillButton");
const logoutButton = document.getElementById("logoutButton");
const statusElement = document.getElementById("status");

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

async function requestProfile(token) {
    const response = await fetch(`${API_BASE_URL}/profile`, {
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

        const { profile } = await requestProfile(token);
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
            profile
        });

        if (!result?.ok) {
            throw new Error("La página no respondió al autocompletado.");
        }

        if (result.filled === 0) {
            setStatus("No se encontraron campos compatibles en esta página.", "error");
            return;
        }

        setStatus(
            `Se completaron ${result.filled} campos correctamente.`,
            "success"
        );
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
    .then((token) => showLoggedIn(Boolean(token)))
    .catch(() => {
        showLoggedIn(false);
        setStatus("No fue posible leer la sesión guardada.", "error");
    });
