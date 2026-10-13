document.getElementById('completeProfileButton').addEventListener('click', () => {
    window.location.href = 'profile.html';
});

document.getElementById('addExperienceButton').addEventListener('click', () => {
    window.location.href = 'profile.html';
});

document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});