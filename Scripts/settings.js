// Scripts/settings.js

document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        loadSettings();

        settingsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            saveSettings();
        });
    } else {
        console.error('Formular mit ID "settingsForm" wurde nicht gefunden.');
    }
});

function loadSettings() {
    // Kategorien laden
    const selectedCategories = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    const checkboxes = document.querySelectorAll('input[name="category"]');

    checkboxes.forEach((checkbox) => {
        if (selectedCategories.includes(checkbox.value)) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }

        // Spezielle Behandlung für "Alle" Checkbox
        if (checkbox.value === 'Alle' && selectedCategories.length === 0) {
            checkbox.checked = true;
        }
    });

    // Spielzeit laden
    const gameTime = parseInt(localStorage.getItem('gameTime'), 10) || 5;
    const gameTimeInput = document.getElementById('gameTime');
    if (gameTimeInput) {
        gameTimeInput.value = gameTime;
    }

    // Maximale Entfernung laden
    const maxDistance = parseFloat(localStorage.getItem('maxDistance')) || 1;
    const maxDistanceInput = document.getElementById('maxDistance');
    if (maxDistanceInput) {
        maxDistanceInput.value = maxDistance;
    }

    // Anzahl der Runden laden
    const numRounds = parseInt(localStorage.getItem('numRounds'), 10) || 3;
    const numRoundsInput = document.getElementById('numRounds');
    if (numRoundsInput) {
        numRoundsInput.value = numRounds;
    }
}

function saveSettings() {
    // Kategorien speichern
    let selectedCategories = [];
    const checkboxes = document.querySelectorAll('input[name="category"]:checked');

    checkboxes.forEach((checkbox) => {
        if (checkbox.value !== 'Alle') {
            selectedCategories.push(checkbox.value);
        }
    });

    // Wenn 'Alle' ausgewählt ist oder keine spezifischen Kategorien, leere das Array
    const alleCheckbox = document.querySelector('input[name="category"][value="Alle"]');
    if (alleCheckbox && alleCheckbox.checked) {
        selectedCategories = [];
    }

    localStorage.setItem('selectedCategories', JSON.stringify(selectedCategories));

    // Spielzeit speichern
    const gameTimeInput = document.getElementById('gameTime');
    if (gameTimeInput) {
        let gameTime = parseInt(gameTimeInput.value, 10);
        if (isNaN(gameTime) || gameTime < 1) {
            gameTime = 5; // Standardwert
        }
        localStorage.setItem('gameTime', gameTime);
    }

    // Maximale Entfernung speichern
    const maxDistanceInput = document.getElementById('maxDistance');
    if (maxDistanceInput) {
        let maxDistance = parseFloat(maxDistanceInput.value);
        if (isNaN(maxDistance) || maxDistance < 0.1) {
            maxDistance = 1; // Standardwert
        }
        localStorage.setItem('maxDistance', maxDistance);
    }

    // Anzahl der Runden speichern
    const numRoundsInput = document.getElementById('numRounds');
    if (numRoundsInput) {
        let numRounds = parseInt(numRoundsInput.value, 10);
        if (isNaN(numRounds) || numRounds < 1) {
            numRounds = 3; // Standardwert
        }
        localStorage.setItem('numRounds', numRounds);
    }

    alert('Einstellungen wurden gespeichert.');
}

