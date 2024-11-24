// scripts/karte.js

L.tileLayer = (png, param2) => {

};
let ready = $(document).ready(function() {
    // Initialisierung der Karte
    let map;
    let L;
    map = L.map('map').setView([49.0069, 8.4037], 13); // Beispielkoordinaten für Karlsruhe

    // OpenStreetMap-Tiles einbinden
    let addTo;
    addTo = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap-Mitwirkende'
    }).addTo(map);

    // Aktueller Punktestand
    var points = 0;
    $("#points").text(points + ' Punkte');

    // Laden der Rätsel
    var riddles = [];
    var currentRiddleIndex = 0;
    var currentRiddle = {};

    fetch('data/riddles.json')
        .then(response => response.json())
        .then(data => {
            riddles = data.riddles;
            currentRiddle = riddles[currentRiddleIndex];
            displayRiddle();
        })
        .catch(error => console.error('Fehler beim Laden der Rätsel:', error));

    function displayRiddle() {
        $('#currentRiddle').text(currentRiddle.question);
    }

    // Hinweis-Button
    $('#hintButton').on('click', function() {
        alert('Hinweis: ' + currentRiddle.hint);
    });

    // Geolocation
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
        var userLat = position.coords.latitude;
        var userLon = position.coords.longitude;

        // Marker für aktuellen Standort
        L.marker([userLat, userLon]).addTo(map);
// Überprüfung der Entfernung zum Schatz
        var distance = getDistance(userLat, userLon, currentRiddle.latitude, currentRiddle.longitude);

        if (distance < currentRiddle.proximity) {
            // Gerät vibrieren lassen
            vibrateDevice();

            // Zusätzliche Hinweise oder nächstes Rätsel freischalten
            alert('Du bist dem Schatz nahe!');

            // Punkte vergeben und zum nächsten Rätsel gehen
            points += currentRiddle.points;
            $('#points').text(points + ' Punkte');

            // Abzeichen hinzufügen (optional)
            addBadge(currentRiddle.badge);

            // Nächstes Rätsel laden
            currentRiddleIndex++;
            if (currentRiddleIndex < riddles.length) {
                currentRiddle = riddles[currentRiddleIndex];
                displayRiddle();
            } else {
                alert('Herzlichen Glückwunsch! Du hast alle Schätze gefunden.');
            }
        }
    }

    function showError(error) {
        console.error('Fehler bei der Standortbestimmung:', error);
    }

    function getDistance(lat1, lon1, lat2, lon2) {
        // Erdumfang in Metern
        var R, b, d, a, c, distance;
        R = 6371e3;
        var f = lat1 * Math.PI / 180, e = lat2 * Math.PI / 180;
        b = (lat2 - lat1) * Math.PI / 180;
        d = (lon2 - lon1) * Math.PI / 180;
        a = Math.sin(b / 2) * Math.sin(b / 2) +
            Math.cos(f) * Math.cos(e) *
            Math.sin(d / 2) * Math.sin(d / 2);
        c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = R * c;


        return distance; // in Metern
    }

    function vibrateDevice() {
        if (navigator.vibrate) {
            navigator.vibrate(1000); // Vibriert für 1 Sekunde
        } else {
            console.log('Vibration API wird nicht unterstützt.');
        }
    }

    function addBadge(badgeName) {
        if (badgeName) {
            $('#badges').append('<span class="badge badge-success mx-1">' + badgeName + '</span>');
        }
    }

    // Zurück zur Startseite
    $('#backButton').on('click', function() {
        window.location.href = 'index.html';
    });
});
