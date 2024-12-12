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

    // Logik für "Alle" Kategorie
    const allCheckbox = document.querySelector('input[name="category"][value="Alle"]');
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]:not([value="Alle"])');

    if (allCheckbox && categoryCheckboxes.length > 0) {
        allCheckbox.addEventListener('change', () => {
            if (allCheckbox.checked) {
                categoryCheckboxes.forEach(cb => cb.checked = true);
            } else {
                categoryCheckboxes.forEach(cb => cb.checked = false);
            }
        });

        categoryCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                if (!cb.checked) {
                    // Wenn eine andere Kategorie abgewählt wird, "Alle" abwählen
                    allCheckbox.checked = false;
                } else {
                    // Prüfen, ob jetzt alle anderen angehakt sind
                    const allChecked = Array.from(categoryCheckboxes).every(c => c.checked);
                    if (allChecked) {
                        allCheckbox.checked = true;
                    }
                }
            });
        });
    }
});

function loadSettings() {
    const selectedCategories = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    const checkboxes = document.querySelectorAll('input[name="category"]');

    checkboxes.forEach((checkbox) => {
        if (selectedCategories.length === 0 && checkbox.value === 'Alle') {
            checkbox.checked = true;
        } else {
            checkbox.checked = selectedCategories.includes(checkbox.value);
        }
    });

    const gameTimeInput = document.getElementById('gameTime');
    if (gameTimeInput) {
        gameTimeInput.value = parseInt(localStorage.getItem('gameTime'), 10) || 5;
    }

    const maxDistanceInput = document.getElementById('maxDistance');
    if (maxDistanceInput) {
        maxDistanceInput.value = parseFloat(localStorage.getItem('maxDistance')) || 1;
    }

    const numRoundsInput = document.getElementById('numRounds');
    if (numRoundsInput) {
        numRoundsInput.value = parseInt(localStorage.getItem('numRounds'), 10) || 3;
    }
}

function saveSettings() {
    let selectedCategories = [];
    const checkboxes = document.querySelectorAll('input[name="category"]:checked');
    checkboxes.forEach((checkbox) => {
        if (checkbox.value !== 'Alle') {
            selectedCategories.push(checkbox.value);
        }
    });

    const alleCheckbox = document.querySelector('input[name="category"][value="Alle"]');
    if (alleCheckbox && alleCheckbox.checked) {
        selectedCategories = [];
    }

    localStorage.setItem('selectedCategories', JSON.stringify(selectedCategories));

    const gameTimeInput = document.getElementById('gameTime');
    if (gameTimeInput) {
        let gameTime = parseInt(gameTimeInput.value, 10);
        if (isNaN(gameTime) || gameTime < 1) {
            gameTime = 5;
        }
        localStorage.setItem('gameTime', gameTime);
    }

    const maxDistanceInput = document.getElementById('maxDistance');
    if (maxDistanceInput) {
        let maxDistance = parseFloat(maxDistanceInput.value);
        if (isNaN(maxDistance) || maxDistance < 0.1) {
            maxDistance = 1;
        }
        localStorage.setItem('maxDistance', maxDistance);
    }

    const numRoundsInput = document.getElementById('numRounds');
    if (numRoundsInput) {
        let numRounds = parseInt(numRoundsInput.value, 10);
        if (isNaN(numRounds) || numRounds < 1) {
            numRounds = 3;
        }
        localStorage.setItem('numRounds', numRounds);
    }

    const saveMessage = document.getElementById('saveMessage');
    if (saveMessage) {
        saveMessage.style.display = 'inline';
        saveMessage.innerText = 'Erfolgreich gespeichert!';
        setTimeout(() => {
            saveMessage.style.display = 'none';
        }, 3000);
    }
}


