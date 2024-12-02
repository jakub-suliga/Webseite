// scripts/main.js

document.addEventListener('DOMContentLoaded', function() {
    // Anzeige der Punkte und gelösten Rätsel
    updateStats();

    // Start-Button
    var startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', function() {
            // Ausgewählte Kategorien speichern
            var selectedCategories = [];
            var checkboxes = document.querySelectorAll('input[name="category"]:checked');
            checkboxes.forEach(function(checkbox) {
                if (checkbox.value !== 'Alle') {
                    selectedCategories.push(checkbox.value);
                }
            });

            // Wenn 'Alle' ausgewählt ist oder keine spezifischen Kategorien, leere das Array
            var alleCheckbox = document.querySelector('input[name="category"][value="Alle"]');
            if (alleCheckbox && alleCheckbox.checked) {
                selectedCategories = [];
            }

            localStorage.setItem('selectedCategories', JSON.stringify(selectedCategories));

            // Weiterleitung zur Karte-Seite
            window.location.href = 'karte.html';
        });
    } else {
        console.error('Start-Button mit ID "startButton" wurde nicht gefunden.');
    }

    const settingsButton = document.querySelector('.settings-button');
    settingsButton.addEventListener('click', function(event) {
        event.stopPropagation();
        this.classList.toggle('active');
    });

    document.addEventListener('click', function() {
        settingsButton.classList.remove('active');
    });
});

// Funktion zur Aktualisierung der Punkte und gelösten Rätsel
function updateStats() {
    var points = parseInt(localStorage.getItem('points')) || 0;
    var solvedRiddles = JSON.parse(localStorage.getItem('solvedRiddles')) || [];

    document.getElementById('totalPoints').innerText = points;
    document.getElementById('solvedRiddlesCount').innerText = solvedRiddles.length;
}

