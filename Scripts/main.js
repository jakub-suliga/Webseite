// scripts/main.js

document.addEventListener('DOMContentLoaded', () => {
    updateStats();

    // Tutorial-Checkbox initialisieren
    const showTutorial = JSON.parse(localStorage.getItem('showTutorial')) !== false;
    const checkbox = document.getElementById('showTutorialCheckbox');
    if (checkbox) {
        checkbox.checked = showTutorial;
        checkbox.addEventListener('change', () => {
            localStorage.setItem('showTutorial', checkbox.checked);
        });
    }

    const settingsButton = document.querySelector('.settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', function(event) {
            event.stopPropagation();
            this.classList.toggle('active');
        });

        document.addEventListener('click', function() {
            settingsButton.classList.remove('active');
        });
    }
});

function updateStats() {
    const points = parseInt(localStorage.getItem('points'), 10) || 0;
    const solvedRiddles = JSON.parse(localStorage.getItem('solvedRiddles')) || [];

    const totalPointsEl = document.getElementById('totalPoints');
    const solvedRiddlesCountEl = document.getElementById('solvedRiddlesCount');

    if (totalPointsEl) totalPointsEl.innerText = points;
    if (solvedRiddlesCountEl) solvedRiddlesCountEl.innerText = solvedRiddles.length;
}
