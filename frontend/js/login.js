document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error);
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        window.location.href = 'main.html';

    } catch (err) {
        alert('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    }
});