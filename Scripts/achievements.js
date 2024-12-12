// Scripts/achievements.js

document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    displayAchievements();
});

// Liste aller möglichen Achievements
const allAchievements = [
    { id: 1, title: '5 Spiele gespielt', condition: (data) => data.gamesPlayed >= 5 },
    { id: 2, title: '10 Spiele gespielt', condition: (data) => data.gamesPlayed >= 10 },
    { id: 3, title: '100 Spiele gespielt', condition: (data) => data.gamesPlayed >= 100 },
    { id: 4, title: '100 Punkte gesammelt', condition: (data) => data.totalPoints >= 100 },
    { id: 5, title: '1000 Punkte gesammelt', condition: (data) => data.totalPoints >= 1000 },
    { id: 6, title: '10000 Punkte gesammelt', condition: (data) => data.totalPoints >= 10000 },
    { id: 7, title: '5 Hinweise benutzt', condition: (data) => data.totalHintsUsed >= 5 },
    { id: 8, title: '10 Hinweise benutzt', condition: (data) => data.totalHintsUsed >= 10 },
    { id: 9, title: '100 Hinweise benutzt', condition: (data) => data.totalHintsUsed >= 100 },
    { id: 10, title: '5 Text-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.text >= 5 },
    { id: 11, title: '10 Text-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.text >= 10 },
    { id: 12, title: '100 Text-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.text >= 100 },
    { id: 13, title: '5 Richtungs-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.direction >= 5 },
    { id: 14, title: '10 Richtungs-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.direction >= 10 },
    { id: 15, title: '100 Richtungs-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.direction >= 100 },
    { id: 16, title: '5 Radius-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.radius >= 5 },
    { id: 17, title: '10 Radius-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.radius >= 10 },
    { id: 18, title: '100 Radius-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.radius >= 100 },
    { id: 19, title: '5 Vibrations-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.vibrate >= 5 },
    { id: 20, title: '10 Vibrations-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.vibrate >= 10 },
    { id: 21, title: '100 Vibrations-Hinweise benutzt', condition: (data) => data.totalHintsUsedData.vibrate >= 100 },
    { id: 22, title: 'Durchschnittliche Entfernung unter 100m erreicht', condition: (data) => data.averageDistance <= 0.1 && data.averageDistance > 0 },
    { id: 23, title: 'Durchschnittliche Entfernung unter 10m erreicht', condition: (data) => data.averageDistance <= 0.01 && data.averageDistance > 0 },
];

function updateStats() {
    const totalPoints = parseInt(localStorage.getItem('totalPoints')) || 0;
    const gamesPlayed = parseInt(localStorage.getItem('gamesPlayed')) || 0;
    const totalHintsUsedData = JSON.parse(localStorage.getItem('totalHintsUsed')) || { text: 0, direction: 0, radius: 0, vibrate: 0 };
    const categoriesPlayedData = JSON.parse(localStorage.getItem('categoriesPlayedData')) || {};

    document.getElementById('totalPoints').innerText = totalPoints;
    document.getElementById('gamesPlayed').innerText = gamesPlayed;

    const averagePointsPerGame = gamesPlayed > 0 ? (totalPoints / gamesPlayed).toFixed(2) : 0;
    document.getElementById('averagePointsPerGame').innerText = averagePointsPerGame;

    // Durchschnittliche Punkte pro Runde und Entfernung zum Ziel
    const totalRoundsPlayed = parseInt(localStorage.getItem('totalRoundsPlayed')) || 0;
    const totalDistance = parseFloat(localStorage.getItem('totalDistance')) || 0;

    const averagePointsPerRound = totalRoundsPlayed > 0 ? (totalPoints / totalRoundsPlayed).toFixed(2) : 0;
    const averageDistance = totalRoundsPlayed > 0 ? (totalDistance / totalRoundsPlayed).toFixed(2) : 0;

    document.getElementById('averagePointsPerRound').innerText = averagePointsPerRound;
    document.getElementById('averageDistance').innerText = averageDistance;

    const totalHintsUsed = totalHintsUsedData.text + totalHintsUsedData.direction + totalHintsUsedData.radius + totalHintsUsedData.vibrate;
    document.getElementById('totalHintsUsed').innerText = totalHintsUsed;
    document.getElementById('totalTextHints').innerText = totalHintsUsedData.text;
    document.getElementById('totalDirectionHints').innerText = totalHintsUsedData.direction;
    document.getElementById('totalRadiusHints').innerText = totalHintsUsedData.radius;
    document.getElementById('totalVibrateHints').innerText = totalHintsUsedData.vibrate;

    // Gespielte Kategorien
    const categoriesList = document.getElementById('categoriesPlayedList');
    categoriesList.innerHTML = ''; // Vorherigen Inhalt löschen

    // Alle verfügbaren Kategorien (ersetzen Sie dies durch Ihre tatsächlichen Kategorien)
    const allCategories = ['Historisch', 'Kunst', 'Natur', 'Technik', 'Sport'];

    allCategories.forEach((category) => {
        const plays = categoriesPlayedData[category] || 0;
        const li = document.createElement('li');
        li.innerText = `${category}: ${plays} mal gespielt`;
        categoriesList.appendChild(li);
    });
}

function displayAchievements() {
    const totalPoints = parseInt(localStorage.getItem('totalPoints')) || 0;
    const gamesPlayed = parseInt(localStorage.getItem('gamesPlayed')) || 0;
    const totalHintsUsedData = JSON.parse(localStorage.getItem('totalHintsUsed')) || { text: 0, direction: 0, radius: 0, vibrate: 0 };
    const totalRoundsPlayed = parseInt(localStorage.getItem('totalRoundsPlayed')) || 0;
    const totalDistance = parseFloat(localStorage.getItem('totalDistance')) || 0;
    const averageDistance = totalRoundsPlayed > 0 ? (totalDistance / totalRoundsPlayed).toFixed(2) : 0;
    const totalHintsUsed = totalHintsUsedData.text + totalHintsUsedData.direction + totalHintsUsedData.radius + totalHintsUsedData.vibrate;

    const data = {
        totalPoints,
        gamesPlayed,
        totalHintsUsed,
        totalHintsUsedData,
        averageDistance,
    };

    const achievementList = document.getElementById('achievementList');
    achievementList.innerHTML = ''; // Vorherigen Inhalt löschen

    allAchievements.forEach((achievement) => {
        const achieved = achievement.condition(data);
        const div = document.createElement('div');
        div.className = 'achievement';
        if (!achieved) {
            div.classList.add('not-achieved');
        }
        div.innerText = achievement.title;
        achievementList.appendChild(div);
    });
}
