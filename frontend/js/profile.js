const token = localStorage.getItem('token');
const API_BASE = 'http://localhost:3000/profile';

// Clave en localStorage para recordar el perfil activo (perfil activo = cliente).
const ACTIVE_PROFILE_KEY = 'activeProfileId';

// Valor especial de la opción "crear nuevo perfil" dentro del <select>.
const CREATE_OPTION_VALUE = '__create__';

// Si no hay token, no tiene sentido estar en esta página — de vuelta al login
if (!token) {
    window.location.href = 'login.html';
}

// Campos del perfil (HU-RNF-011). Cada clave coincide con el `id` del input
// en profile.html y con la clave camelCase que espera POST /profile.
// GET /profile devuelve las mismas claves en snake_case (columnas de MySQL).
const PROFILE_FIELDS = [
    'firstName', 'lastName', 'email', 'phone', 'documentType', 'documentNumber', 'birthDate',
    'country', 'state', 'city', 'address', 'postalCode',
    'headline', 'summary', 'currentTitle', 'currentCompany', 'yearsExperience', 'salaryExpectation',
    'educationLevel', 'institution', 'fieldOfStudy', 'graduationYear', 'languages',
    'linkedin', 'github', 'portfolio'
];

const toSnakeCase = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// Campos evaluados para el porcentaje de completitud del perfil: todos los
// campos del formulario más las habilidades (skills).
const PROGRESS_FIELD_IDS = [...PROFILE_FIELDS, 'skills'];

const profileSelect = document.getElementById('profileSelect');
const newProfileButton = document.getElementById('newProfileButton');

// Perfil que se está visualizando/editando ahora mismo.
let activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY) || null;

function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${token}`, ...extra };
}

function setActiveProfile(id) {
    activeProfileId = id ? String(id) : null;
    if (activeProfileId) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
    } else {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
}

function calcularYGuardarProgreso() {
    let filledCount = 0;
    PROGRESS_FIELD_IDS.forEach((id) => {
        const input = document.getElementById(id);
        if (input && input.value && input.value.trim() !== '') {
            filledCount++;
        }
    });

    const porcentaje = Math.round((filledCount / PROGRESS_FIELD_IDS.length) * 100);
    localStorage.setItem('profileProgress', porcentaje);
}

// Vacía todos los campos del formulario (para un perfil recién creado).
function limpiarFormulario() {
    for (const key of PROFILE_FIELDS) {
        document.getElementById(key).value = '';
    }
    document.getElementById('skills').value = '';
    document.getElementById('profileName').value = '';
}

// Rellena el <select> con la lista de perfiles + opción de crear al final.
function renderProfileOptions(profiles) {
    profileSelect.innerHTML = '';

    for (const profile of profiles) {
        const option = document.createElement('option');
        option.value = String(profile.id);
        option.textContent = profile.name || 'Perfil sin nombre';
        profileSelect.appendChild(option);
    }

    // Acceso rápido: última opción del desplegable crea un perfil nuevo.
    const createOption = document.createElement('option');
    createOption.value = CREATE_OPTION_VALUE;
    createOption.textContent = '+ Crear nuevo perfil…';
    profileSelect.appendChild(createOption);

    if (activeProfileId && profiles.some((p) => String(p.id) === activeProfileId)) {
        profileSelect.value = activeProfileId;
    } else if (profiles.length > 0) {
        setActiveProfile(profiles[0].id);
        profileSelect.value = activeProfileId;
    }
}

// Carga la lista de perfiles del usuario desde el backend.
async function cargarListaPerfiles() {
    const res = await fetch(`${API_BASE}/list`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar la lista de perfiles');
    }
    return data.profiles || [];
}

// Trae los datos de un perfil concreto y los pinta en el formulario.
async function cargarPerfil(id) {
    const url = id ? `${API_BASE}?id=${encodeURIComponent(id)}` : API_BASE;
    const res = await fetch(url, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
        alert(data.error);
        return;
    }

    const profile = data.profile || {};

    for (const key of PROFILE_FIELDS) {
        document.getElementById(key).value = profile[toSnakeCase(key)] ?? '';
    }

    document.getElementById('profileName').value = profile.profile_name ?? '';

    // Si aún no hay correo de contacto, se sugiere el de la cuenta.
    if (!profile.email && data.accountEmail) {
        document.getElementById('email').value = data.accountEmail;
    }

    document.getElementById('skills').value = (data.skills || []).join(', ');

    calcularYGuardarProgreso();
}

// Crea un perfil nuevo (vacío) y lo deja como activo.
async function crearPerfilNuevo() {
    const nombre = prompt('Nombre del nuevo perfil:', 'Nuevo perfil');
    if (nombre === null) {
        // El usuario canceló: devolvemos el <select> al perfil activo.
        if (activeProfileId) {
            profileSelect.value = activeProfileId;
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/create`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ name: nombre.trim() })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'No se pudo crear el perfil');
        }

        setActiveProfile(data.profile.id);
        const profiles = await cargarListaPerfiles();
        renderProfileOptions(profiles);
        limpiarFormulario();
        document.getElementById('profileName').value = data.profile.name;
        calcularYGuardarProgreso();
    } catch (err) {
        alert(err.message || 'No se pudo crear el perfil.');
        if (activeProfileId) {
            profileSelect.value = activeProfileId;
        }
    }
}

// Cambio de selección en el desplegable.
profileSelect.addEventListener('change', async () => {
    const value = profileSelect.value;

    if (value === CREATE_OPTION_VALUE) {
        await crearPerfilNuevo();
        return;
    }

    setActiveProfile(value);
    await cargarPerfil(value);
});

// Botón externo "Crear nuevo perfil +".
newProfileButton.addEventListener('click', crearPerfilNuevo);

// Carga inicial: lista de perfiles + datos del perfil activo.
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const profiles = await cargarListaPerfiles();
        renderProfileOptions(profiles);

        if (profiles.length > 0) {
            await cargarPerfil(activeProfileId || profiles[0].id);
        } else {
            // Usuario sin perfiles aún: el formulario arranca vacío y, al
            // guardar, el backend crea el primero automáticamente.
            calcularYGuardarProgreso();
        }
    } catch (err) {
        console.error('No se pudo inicializar la pantalla de perfiles', err);
    }
});

// Actualiza el progreso en tiempo real al escribir.
PROGRESS_FIELD_IDS.forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('input', calcularYGuardarProgreso);
    }
});

// Guardar el perfil activo.
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {};
    for (const key of PROFILE_FIELDS) {
        payload[key] = document.getElementById(key).value.trim();
    }
    payload.profileName = document.getElementById('profileName').value.trim();
    payload.skills = document.getElementById('skills').value
        .split(',')
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);

    calcularYGuardarProgreso();

    const url = activeProfileId
        ? `${API_BASE}?id=${encodeURIComponent(activeProfileId)}`
        : API_BASE;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error);
            return;
        }

        // Si era el primer perfil (sin id), guardamos el id devuelto como activo.
        if (!activeProfileId && data.profileId) {
            setActiveProfile(data.profileId);
        }

        alert('Perfil guardado correctamente');
        window.location.href = 'main.html';
    } catch (err) {
        alert('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    }
});
