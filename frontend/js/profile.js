const token = localStorage.getItem('token');
const API_URL = 'http://localhost:3000/profile';

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

function calcularYGuardarProgreso() {
    let filledCount = 0;
    PROGRESS_FIELD_IDS.forEach(id => {
        const input = document.getElementById(id);
        if (input && input.value && input.value.trim() !== '') {
            filledCount++;
        }
    });

    const porcentaje = Math.round((filledCount / PROGRESS_FIELD_IDS.length) * 100);
    localStorage.setItem('profileProgress', porcentaje);
}

// Al cargar la página, intenta traer el perfil que ya exista (si es la
// primera vez, el backend responde profile: null y el form queda vacío)
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error);
            return;
        }

        const profile = data.profile || {};

        for (const key of PROFILE_FIELDS) {
            const value = profile[toSnakeCase(key)];
            document.getElementById(key).value = value ?? '';
        }

        // Si aún no hay correo de contacto, se sugiere el de la cuenta.
        if (!profile.email && data.accountEmail) {
            document.getElementById('email').value = data.accountEmail;
        }

        document.getElementById('skills').value = (data.skills || []).join(', ');

        // Calcular y sincronizar el progreso apenas carguen los datos
        calcularYGuardarProgreso();

    } catch (err) {
        console.error('No se pudo cargar el perfil existente', err);
    }
});

// Escuchar cambios en tiempo real en cada input para actualizar el progreso al instante
PROGRESS_FIELD_IDS.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('input', calcularYGuardarProgreso);
    }
});

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {};
    for (const key of PROFILE_FIELDS) {
        payload[key] = document.getElementById(key).value.trim();
    }

    payload.skills = document.getElementById('skills').value
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);

    // Asegurar que el progreso quede actualizado antes de enviar
    calcularYGuardarProgreso();

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error);
            return;
        }

        alert('Perfil guardado correctamente');
        window.location.href = 'main.html';

    } catch (err) {
        alert('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    }
});
