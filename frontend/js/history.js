const token = localStorage.getItem('token');

// Si no hay token, no tiene sentido estar en esta página — de vuelta al login
if (!token) {
    window.location.href = 'login.html';
}

const API_URL = 'http://localhost:3000/logs';

// Nombres legibles de los campos que guarda la extensión
// (claves de extension/src/core/fieldCatalog.js)
const FIELD_LABELS = {
    fullName: 'Nombre completo',
    firstGivenName: 'Primer nombre',
    middleName: 'Segundo nombre',
    firstName: 'Nombre',
    firstSurname: 'Primer apellido',
    secondSurname: 'Segundo apellido',
    lastName: 'Apellido',
    email: 'Correo',
    phoneCountryCode: 'Indicativo',
    phoneNational: 'Teléfono sin indicativo',
    phone: 'Teléfono',
    documentType: 'Tipo de documento',
    documentNumber: 'Número de documento',
    birthDate: 'Fecha de nacimiento',
    postalCode: 'Código postal',
    address: 'Dirección',
    country: 'País',
    state: 'Departamento / estado',
    city: 'Ciudad',
    location: 'Ubicación',
    headline: 'Titular profesional',
    summary: 'Resumen',
    salaryExpectation: 'Aspiración salarial',
    yearsExperience: 'Años de experiencia',
    currentTitle: 'Cargo actual',
    currentCompany: 'Empresa actual',
    educationLevel: 'Nivel de estudios',
    graduationYear: 'Año de graduación',
    institution: 'Institución educativa',
    fieldOfStudy: 'Área de estudio',
    languages: 'Idiomas',
    skills: 'Habilidades',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    portfolio: 'Portafolio'
};

const historyList = document.getElementById('historyList');
const historyStatus = document.getElementById('historyStatus');
const historyCount = document.getElementById('historyCount');
const clearHistoryButton = document.getElementById('clearHistoryButton');

function formatDate(value) {
    return new Date(value).toLocaleString('es-CO', {
        dateStyle: 'long',
        timeStyle: 'short'
    });
}

// Se usa textContent (no innerHTML) porque el sitio web viene de la base de datos
function createHistoryItem(log) {
    const item = document.createElement('li');
    item.className = 'history-item';

    const website = document.createElement('p');
    website.className = 'history-item__website';
    website.textContent = log.website;

    const date = document.createElement('time');
    date.className = 'history-item__date';
    date.dateTime = log.date;
    date.textContent = formatDate(log.date);

    item.append(website, date);

    if (log.fieldsCompleted.length > 0) {
        const fields = document.createElement('ul');
        fields.className = 'history-item__fields';
        fields.setAttribute('aria-label', 'Campos completados');

        for (const field of log.fieldsCompleted) {
            const chip = document.createElement('li');
            chip.textContent = FIELD_LABELS[field] || field;
            fields.append(chip);
        }

        item.append(fields);
    }

    return item;
}

function renderHistory(logs) {
    historyList.replaceChildren(...logs.map(createHistoryItem));
    clearHistoryButton.disabled = logs.length === 0;

    if (logs.length === 0) {
        historyCount.textContent = '';
        historyStatus.textContent = 'Todavía no has autocompletado formularios con FillPro.';
        return;
    }

    historyCount.textContent = logs.length === 1
        ? '1 autocompletado'
        : `${logs.length} autocompletados`;
    historyStatus.textContent = '';
}

async function requestHistory(method) {
    const res = await fetch(API_URL, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await res.json();

    // Token vencido o inválido: hay que iniciar sesión otra vez
    if (res.status === 401) {
        localStorage.clear();
        window.location.href = 'login.html';
        return null;
    }

    if (!res.ok) {
        throw new Error(data.error);
    }

    return data;
}

async function loadHistory() {
    try {
        const logs = await requestHistory('GET');
        if (logs) {
            renderHistory(logs);
        }
    } catch (err) {
        historyStatus.textContent = 'No se pudo cargar el historial. ¿Está corriendo el backend?';
    }
}

clearHistoryButton.addEventListener('click', async () => {
    const confirmed = confirm('¿Seguro que quieres borrar todo tu historial? Esta acción no se puede deshacer.');
    if (!confirmed) {
        return;
    }

    clearHistoryButton.disabled = true;

    try {
        const result = await requestHistory('DELETE');
        if (result) {
            renderHistory([]);
            historyStatus.textContent = 'Historial borrado correctamente.';
        }
    } catch (err) {
        clearHistoryButton.disabled = false;
        historyStatus.textContent = 'No se pudo borrar el historial. Inténtalo de nuevo.';
    }
});

loadHistory();
