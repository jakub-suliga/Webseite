// scripts/karte.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialisierung der Karte
    const map = L.map('map').setView([49.0069, 8.4037], 13); // Karlsruhe

    // OpenStreetMap-Tiles einbinden
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap-Mitwirkende'
    }).addTo(map);

    // Variablen
    let riddles = [];
    let currentRiddleIndex = 0;
    let currentRiddle = {};
    let hintsUsed = 0;
    let maxHints = 3;
    let userMarker = null;

    // Laden der Rätsel
    fetch('data/riddles.json')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Netzwerkantwort war nicht ok');
            }
            return response.json();
        })
        .then(function(data) {
            riddles = data.riddles;
            if (riddles.length > 0) {
                currentRiddle = riddles[currentRiddleIndex];
                displayRiddle();
            } else {
                document.getElementById('currentRiddle').innerText = 'Keine Rätsel verfügbar.';
            }
        })
        .catch(function(error) {
            console.error('Fehler beim Laden der Rätsel:', error);
            document.getElementById('currentRiddle').innerText = 'Fehler beim Laden der Rätsel.';
        });

    // Funktion zur Anzeige des aktuellen Rätsels
    function displayRiddle() {
        document.getElementById('currentRiddle').innerText = currentRiddle.question;
        document.getElementById('currentHint').innerText = '';
        hintsUsed = 0;
    }

    // Hinweis-Button
    const hintButton = document.getElementById('hintButton');
    hintButton.addEventListener('click', function() {
        if (hintsUsed < maxHints) {
            hintsUsed++;
            const hintText = currentRiddle['hint' + hintsUsed];
            if (hintText) {
                const currentHintElement = document.getElementById('currentHint');
                currentHintElement.innerText = 'Hinweis ' + hintsUsed + ': ' + hintText;
            } else {
                alert('Keine weiteren Hinweise verfügbar.');
            }
        } else {
            alert('Du hast bereits alle Hinweise für dieses Rätsel genutzt.');
        }
    });

    // Vibrationshinweis-Button
    const vibrateButton = document.getElementById('vibrateButton');
    vibrateButton.addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                const distance = getDistance(userLat, userLon, currentRiddle.latitude, currentRiddle.longitude);

                // Vibrationsdauer basierend auf Entfernung
                const vibrationDuration = calculateVibrationDuration(distance);
                vibrateDevice(vibrationDuration);
            }, showError, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000,
            });
        } else {
            alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
        }
    });

    // Geolocation überwachen
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(updatePosition, showError, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000,
        });
    } else {
        alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
    }

    function updatePosition(position) {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        // Aktualisieren des Benutzermarkers
        if (userMarker) {
            userMarker.setLatLng([userLat, userLon]);
        } else {
            userMarker = L.marker([userLat, userLon]).addTo(map);
        }

        // Überprüfung der Entfernung zum Schatz
        const distance = getDistance(userLat, userLon, currentRiddle.latitude, currentRiddle.longitude);

        if (distance < currentRiddle.proximity) {
            // Schatz gefunden
            alert('Herzlichen Glückwunsch! Du hast den Schatz gefunden.');

            // Nächstes Rätsel laden
            currentRiddleIndex++;
            if (currentRiddleIndex < riddles.length) {
                currentRiddle = riddles[currentRiddleIndex];
                displayRiddle();
            } else {
                alert('Du hast alle Schätze gefunden!');
                document.getElementById('currentRiddle').innerText = 'Du hast alle Schätze gefunden!';
                document.getElementById('currentHint').innerText = '';
            }
        }
    }

    function showError(error) {
        console.error('Fehler bei der Standortbestimmung:', error);
    }

    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Erdumfang in Metern
        const x = lat1 * Math.PI / 180;
        const y = lat2 * Math.PI / 180;
        const z = (lat2 - lat1) * Math.PI / 180;
        const e = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(z / 2) * Math.sin(z / 2) +
            Math.cos(x) * Math.cos(y) *
            Math.sin(e / 2) * Math.sin(e / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in Metern
    }

    function calculateVibrationDuration(distance) {
        const maxDistance = 2000; // Maximale Entfernung für Vibrationshinweis in Metern
        const minDuration = 200; // Mindestvibrationsdauer in Millisekunden
        const maxDuration = 1000; // Maximale Vibrationsdauer in Millisekunden

        if (distance > maxDistance) {
            return minDuration;
        } else {
            // Je näher, desto länger vibriert es
            const duration = maxDuration - ((distance / maxDistance) * (maxDuration - minDuration));
            return Math.floor(duration);
        }
    }

    function vibrateDevice(duration) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        } else {
            console.log('Vibration API wird nicht unterstützt.');
        }
    }
});
