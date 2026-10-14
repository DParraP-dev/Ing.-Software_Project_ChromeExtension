const token = localStorage.getItem('token');

// Si no hay token, no tiene sentido estar en esta página — de vuelta al login
if (!token) {
    window.location.href = 'login.html';
}

// Lista de los campos evaluados para el porcentaje de completitud
const profileFieldIds = ['firstName', 'lastName', 'phone', 'country', 'city', 'linkedin', 'github', 'skills'];

function calcularYGuardarProgreso() {
    let filledCount = 0;
    profileFieldIds.forEach(id => {
        const input = document.getElementById(id);
        if (input && input.value && input.value.trim() !== '') {
            filledCount++;
        }
    });

    const porcentaje = Math.round((filledCount / profileFieldIds.length) * 100);
    localStorage.setItem('profileProgress', porcentaje);
}

// Al cargar la página, intenta traer el perfil que ya exista
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('http://localhost:3000/profile', {
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

        if (data.profile) {
            document.getElementById('firstName').value = data.profile.first_name || '';
            document.getElementById('lastName').value = data.profile.last_name || '';
            document.getElementById('phone').value = data.profile.phone || '';
            document.getElementById('country').value = data.profile.country || '';
            document.getElementById('city').value = data.profile.city || '';
            document.getElementById('linkedin').value = data.profile.linkedin || '';
            document.getElementById('github').value = data.profile.github || '';
            document.getElementById('skills').value = data.skills ? data.skills.join(', ') : '';
        }

        // Calcular y sincronizar el progreso apenas carguen los datos
        calcularYGuardarProgreso();

    } catch (err) {
        console.error('No se pudo cargar el perfil existente', err);
    }
});

// Escuchar cambios en tiempo real en cada input para actualizar el progreso al instante
profileFieldIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('input', calcularYGuardarProgreso);
    }
});

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const phone = document.getElementById('phone').value;
    const country = document.getElementById('country').value;
    const city = document.getElementById('city').value;
    const linkedin = document.getElementById('linkedin').value;
    const github = document.getElementById('github').value;

    const skillsRaw = document.getElementById('skills').value;
    const skills = skillsRaw
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);

    // Asegurar que el progreso quede actualizado antes de enviar
    calcularYGuardarProgreso();

    try {
        const res = await fetch('http://localhost:3000/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ firstName, lastName, phone, country, city, linkedin, github, skills })
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