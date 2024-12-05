// Scripts/achievements.js

document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    loadAchievements();
});

// Funktion zur Aktualisierung der Punkte und gelösten Rätsel
function updateStats() {
    const points = parseInt(localStorage.getItem('points'), 10) || 0;
    const solvedRiddles = JSON.parse(localStorage.getItem('solvedRiddles')) || [];

    const totalPointsElement = document.getElementById('totalPoints');
    if (totalPointsElement) {
        totalPointsElement.innerText = points;
    } else {
        console.error('Element mit ID "totalPoints" wurde nicht gefunden.');
    }

    const solvedRiddlesCountElement = document.getElementById('solvedRiddlesCount');
    if (solvedRiddlesCountElement) {
        solvedRiddlesCountElement.innerText = solvedRiddles.length;
    } else {
        console.error('Element mit ID "solvedRiddlesCount" wurde nicht gefunden.');
    }
}

// Funktion zum Laden der Achievements
function loadAchievements() {
    const achievementsContainer = document.getElementById('achievementsContainer');
    if (!achievementsContainer) {
        console.error('Element mit ID "achievementsContainer" wurde nicht gefunden.');
        return;
    }

    const achievements = JSON.parse(localStorage.getItem('achievements')) || [];

    // Beispielhafte Achievements (können durch dynamische Inhalte ersetzt werden)
    achievementsContainer.innerHTML = '';

    achievements.forEach((achievement) => {
        const achievementDiv = document.createElement('div');
        achievementDiv.classList.add('achievement');

        achievementDiv.innerHTML = `
            <img src="${achievement.image}" alt="${achievement.title}">
            <h3>${achievement.title}</h3>
            <p>${achievement.description}</p>
        `;

        achievementsContainer.appendChild(achievementDiv);
    });
}
