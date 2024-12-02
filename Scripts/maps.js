document.addEventListener('DOMContentLoaded', function() {
    var riddles = [];
    var solvedRiddles = JSON.parse(localStorage.getItem('solvedRiddles')) || [];
    var points = parseInt(localStorage.getItem('points')) || 0;
    var currentRiddle = {};
    var hintsUsed = {
        text: 0,
        direction: 0,
        radius: 0
    };
    var maxHints = 3;
    var userMarker = null;
    var directionLine = null;
    var directionArrow = null;
    var radiusCircle = null;
    var hintsAvailable = [];
    var totalRiddlesCount = 0;
    var selectedCategories = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    var currentCity = null;
    var treasureMarker = null;

    var round = 1;
    var maxRounds = 3;
    var roundTimer = null;
    var roundDuration = 5 * 60 * 1000; // 5 Minuten in Millisekunden

    // Initialisiere die Karte
    var map = L.map('map');

    // Überprüfe, ob Geolocation unterstützt wird
    if (navigator.geolocation) {
        // Versuche, die aktuelle Position des Geräts zu ermitteln
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;
            // Zentriere die Karte auf die aktuelle Position
            map.setView([lat, lon], 18);

            // Starte das Spiel erst, nachdem die Position erfolgreich ermittelt wurde
            loadRiddles(); // Funktion zum Laden der Rätsel
        }, function(error) {
            // Fehlerbehandlung, falls die Position nicht ermittelt werden kann
            alert('Um dieses Spiel zu spielen, muss der Standortzugriff erlaubt sein.');
            window.location.href = 'index.html'; // Optional: Zurück zur Startseite
        });
    } else {
        // Geolocation wird nicht unterstützt
        alert('Geolocation wird von Ihrem Browser nicht unterstützt. Dieses Spiel kann nicht gespielt werden.');
        window.location.href = 'index.html'; // Optional: Zurück zur Startseite
    }

    // OpenStreetMap-Tiles einbinden
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap-Mitwirkende'
    }).addTo(map);

    // Initialisierung der Punkteanzeige
    var pointsDisplay = L.control({ position: 'topright' });

    pointsDisplay.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'points-display');
        div.innerHTML = 'Punkte: ' + points;
        return div;
    };

    // Punkteanzeige auf der Karte aktualisieren
    function updatePointsDisplay() {
        var div = document.querySelector('.points-display');
        if (div) {
            div.innerHTML = 'Punkte: ' + points;
        }
    }

    updatePointsDisplay(); // Initialer Aufruf

    // Bounding Boxes für die Städte
    const cityBoundaries = {
        "Karlsruhe": {
            latMin: 48.95,
            latMax: 49.08,
            lonMin: 8.32,
            lonMax: 8.5
        },
        "Stuttgart": {
            latMin: 48.72,
            latMax: 48.83,
            lonMin: 9.08,
            lonMax: 9.27
        }
    };

    // Geolocation abrufen
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var userLat = position.coords.latitude;
            var userLon = position.coords.longitude;

            // Bestimmen der aktuellen Stadt
            currentCity = getCurrentCity(userLat, userLon);

            if (currentCity) {
                // Karte auf aktuelle Position zentrieren
                map.setView([userLat, userLon], 18);

                // Benutzer-Marker hinzufügen
                userMarker = L.marker([userLat, userLon]).addTo(map).bindPopup("Deine Position").openPopup();

                // Laden der Rätsel
                loadRiddles();
            } else {
                alert('Es gibt keine Rätsel für Ihren aktuellen Standort.');
                window.location.href = 'index.html';
            }

        }, function(error) {
            console.error('Fehler bei der Standortbestimmung:', error);
            alert('Konnte Ihren Standort nicht ermitteln.');
            window.location.href = 'index.html';
        });
    } else {
        alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
        window.location.href = 'index.html';
    }

    // Funktion zur Bestimmung der Stadt
    function getCurrentCity(lat, lon) {
        for (const city in cityBoundaries) {
            const bounds = cityBoundaries[city];
            if (
                lat >= bounds.latMin && lat <= bounds.latMax &&
                lon >= bounds.lonMin && lon <= bounds.lonMax
            ) {
                return city;
            }
        }
        return null; // Stadt nicht gefunden
    }


    // Funktion zum Laden der Rätsel
    function loadRiddles() {
        fetch("Data/riddles.json")
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Netzwerkantwort war nicht ok');
                }
                return response.json();
            })
            .then(function(data) {
                console.log('Geladene Daten:', data); // Debugging
                var allRiddles = data.riddles;
                // Filter nach Stadt
                riddles = allRiddles.filter(function(riddle) {
                    return riddle.city === currentCity;
                });
                // Filter nach Kategorie, wenn Kategorien ausgewählt sind
                if (selectedCategories.length > 0) {
                    riddles = riddles.filter(function(riddle) {
                        return selectedCategories.includes(riddle.category);
                    });
                }
                // Entfernen der gelösten Rätsel
                riddles = riddles.filter(function(riddle) {
                    return !solvedRiddles.includes(riddle.id);
                });
                totalRiddlesCount = riddles.length;

                if (riddles.length > 0) {
                    currentRiddle = getRandomRiddle();
                    displayRiddle();
                    pointsDisplay.addTo(map);
                } else {
                    alert('Es gibt keine verfügbaren Rätsel für Ihren Standort und die ausgewählten Kategorien.');
                    window.location.href = 'index.html';
                }
            })
            .catch(function(error) {
                console.error('Fehler beim Laden der Rätsel:', error);
                document.getElementById('currentRiddle').innerText = 'Fehler beim Laden der Rätsel.';
            });
    }

    // Funktion zur zufälligen Auswahl eines ungelösten Rätsels
    function getRandomRiddle() {
        if (riddles.length === 0) return null;
        var randomIndex = Math.floor(Math.random() * riddles.length);
        console.log('Ausgewähltes Rätsel:', riddles[randomIndex]); // Debugging
        return riddles[randomIndex];
    }

    // Funktion zur Anzeige des aktuellen Rätsels
    function displayRiddle() {
        if (!currentRiddle || !currentRiddle.question) {
            console.error('currentRiddle ist undefiniert oder hat keine Frage:', currentRiddle);
            document.getElementById('currentRiddle').innerText = 'Kein gültiges Rätsel gefunden.';
            return;
        }

        console.log('Anzeige des Rätsels:', currentRiddle); // Debugging

        document.getElementById('currentRiddle').innerText = currentRiddle.question;
        document.getElementById('currentHint').innerText = '';
        document.getElementById('riddleAnswer').style.display = 'none';
        document.getElementById('answerText').innerText = '';

        hintsUsed = {
            text: 0,
            direction: 0,
            radius: 0
        };
        hintsAvailable = currentRiddle.hints.slice(); // Kopie der Hinweise
        updatePointsDisplay();
        enableHintButton();
    }

    // Funktion zum Hinzufügen des Schatz-Markers
    function addTreasureMarker() {
        if (treasureMarker) {
            map.removeLayer(treasureMarker);
        }
        treasureMarker = L.marker([currentRiddle.latitude, currentRiddle.longitude]).addTo(map);
        treasureMarker.bindPopup('Schatz gefunden!');
    }

    // Berechnung der Punkte für das aktuelle Rätsel
    function calculatePoints() {
        // Exponentieller Punkteabzug basierend auf genutzten Hinweisen
        var basePoints = currentRiddle.points;
        var penalty = 0;
        penalty += Math.pow(2, hintsUsed.text) - 1;
        penalty += Math.pow(2, hintsUsed.direction) - 1;
        penalty += Math.pow(2, hintsUsed.radius) - 1;
        var finalPoints = basePoints - penalty;
        return Math.max(finalPoints, 0); // Mindestens 0 Punkte
    }

    // Kombinierter Hinweis-Button
    var hintButton = document.getElementById('hintButton');
    var hintMenu = document.getElementById('hintMenu');
    hintButton.addEventListener('click', function() {
        hintMenu.classList.toggle('show');
    });

    // Hinweis-Optionen
    var textHintButton = document.getElementById('textHintButton');
    var directionHintButton = document.getElementById('directionHintButton');
    var radiusHintButton = document.getElementById('radiusHintButton');

    // Text-Hinweis
    textHintButton.addEventListener('click', function() {
        if (hintsUsed.text < maxHints && hintsAvailable.length > 0) {
            hintsUsed.text++;
            var hintText = hintsAvailable.shift();
            var currentHintElement = document.getElementById('currentHint');
            currentHintElement.innerText += 'Hinweis ' + hintsUsed.text + ': ' + hintText + '\n';
            updatePointsDisplay();
        }
        if (hintsUsed.text >= maxHints || hintsAvailable.length === 0) {
            textHintButton.disabled = true;
            textHintButton.style.opacity = 0.5;
        }
    });

    // Richtungs-Hinweis
    directionHintButton.addEventListener('click', function() {
        if (hintsUsed.direction < maxHints) {
            hintsUsed.direction++;
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    var userLat = position.coords.latitude;
                    var userLon = position.coords.longitude;

                    if (directionLine) {
                        map.removeLayer(directionLine);
                    }
                    if (directionArrow) {
                        map.removeLayer(directionArrow);
                    }

                    // Linie vom Nutzer zum Schatz
                    directionLine = L.polyline([
                        [userLat, userLon],
                        [currentRiddle.latitude, currentRiddle.longitude]
                    ], {color: 'blue', dashArray: '5, 10'}).addTo(map);

                    // Pfeil hinzufügen
                    directionArrow = L.polylineDecorator(directionLine, {
                        patterns: [
                            {
                                offset: '100%',
                                repeat: 0,
                                symbol: L.Symbol.arrowHead({
                                    pixelSize: 15,
                                    polygon: false,
                                    pathOptions: {stroke: true, color: 'blue', weight: 2}
                                })
                            }
                        ]
                    }).addTo(map);

                    map.fitBounds(directionLine.getBounds());

                    console.log('Richtungs-Hinweis gezeichnet von [' + userLat + ', ' + userLon + '] zu [' + currentRiddle.latitude + ', ' + currentRiddle.longitude + '].'); // Debugging

                    updatePointsDisplay();
                }, showError, {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000,
                });
            } else {
                alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
            }
        }
        if (hintsUsed.direction >= maxHints) {
            directionHintButton.disabled = true;
            directionHintButton.style.opacity = 0.5;
        }
    });

    // Radius-Hinweis
    radiusHintButton.addEventListener('click', function() {
        if (hintsUsed.radius < maxHints) {
            hintsUsed.radius++;
            var radius;
            switch (hintsUsed.radius) {
                case 1:
                    radius = 1000;
                    break;
                case 2:
                    radius = 500;
                    break;
                case 3:
                    radius = 200;
                    break;
                default:
                    radius = 100;
            }
            if (radiusCircle) {
                map.removeLayer(radiusCircle);
            }
            radiusCircle = L.circle([currentRiddle.latitude, currentRiddle.longitude], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.1,
                radius: radius
            }).addTo(map);
            updatePointsDisplay();
        }
        if (hintsUsed.radius >= maxHints) {
            radiusHintButton.disabled = true;
            radiusHintButton.style.opacity = 0.5;
        }
    });

    // Vibrationshinweis-Button
    var vibrateButton = document.getElementById('vibrateButton');
    vibrateButton.addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                var userLat = position.coords.latitude;
                var userLon = position.coords.longitude;
                var distance = getDistance(userLat, userLon, currentRiddle.latitude, currentRiddle.longitude);

                // Vibrationsdauer basierend auf Entfernung
                var vibrationDuration = calculateVibrationDuration(distance);
                vibrateDevice(vibrationDuration);

                console.log('Vibrationshinweis: Entfernung = ' + distance + ' Meter, Dauer = ' + vibrationDuration + ' ms'); // Debugging
            }, showError, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000,
            });
        } else {
            alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
        }
    });

    // Neues Rätsel Button
    var newRiddleButton = document.getElementById('newRiddleButton');
    newRiddleButton.addEventListener('click', function() {
        // Neues Rätsel auswählen
        if (riddles.length > 1) {
            // Entfernen des aktuellen Rätsels aus der Liste
            riddles = riddles.filter(function(riddle) {
                return riddle.id !== currentRiddle.id;
            });
            currentRiddle = getRandomRiddle();
            displayRiddle();
            addTreasureMarker();
            // Entfernen von Hinweisen und Markierungen
            if (directionLine) {
                map.removeLayer(directionLine);
                directionLine = null;
            }
            if (directionArrow) {
                map.removeLayer(directionArrow);
                directionArrow = null;
            }
            if (radiusCircle) {
                map.removeLayer(radiusCircle);
                radiusCircle = null;
            }
        } else {
            alert('Keine weiteren Rätsel verfügbar.');
        }
    });

    // Event Listener für "Lösung anzeigen"-Button
    var showSolutionButton = document.getElementById('showSolutionButton');
    showSolutionButton.addEventListener('click', function() {
        var answerText = document.getElementById('answerText');
        answerText.innerText = currentRiddle.answer;
        document.getElementById('riddleAnswer').style.display = 'block';
        console.log('Lösung angezeigt:', currentRiddle.answer); // Debugging

        // Optional: Punkte abziehen oder andere Logik implementieren
        // Beispiel: Punkte reduzieren für das Anzeigen der Lösung
        var penalty = 10; // Beispielhafte Strafe
        points = Math.max(points - penalty, 0);
        localStorage.setItem('points', points);
        addTreasureMarker();
        updatePointsDisplay();
    });

    function showError(error) {
        console.error('Fehler bei der Standortbestimmung:', error);
    }

    function getDistance(lat1, lon1, lat2, lon2) {
        var R = 6371e3; // Erdumfang in Metern
        var φ1 = lat1 * Math.PI / 180;
        var φ2 = lat2 * Math.PI / 180;
        var Δφ = (lat2 - lat1) * Math.PI / 180;
        var Δλ = (lon2 - lon1) * Math.PI / 180;

        var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        var distance = R * c;
        return distance; // in Metern
    }

    function calculateVibrationDuration(distance) {
        var maxDistance = 2000; // Maximale Entfernung für Vibrationshinweis in Metern
        var minDuration = 200; // Mindestvibrationsdauer in Millisekunden
        var maxDuration = 1000; // Maximale Vibrationsdauer in Millisekunden

        if (distance > maxDistance) {
            return minDuration;
        } else {
            // Je näher, desto länger vibriert es
            var duration = maxDuration - ((distance / maxDistance) * (maxDuration - minDuration));
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

    function enableHintButton() {
        hintButton.disabled = false;
        hintButton.style.opacity = 1;

        // Aktivieren der Hinweisoptionen
        textHintButton.disabled = false;
        textHintButton.style.opacity = 1;
        directionHintButton.disabled = false;
        directionHintButton.style.opacity = 1;
        radiusHintButton.disabled = false;
        radiusHintButton.style.opacity = 1;
    }

    // Funktion zur Anzeige der Erfolgsmeldung
    function showRiddleSolvedMessage(pointsEarned) {
        var overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.innerHTML = `
      <div class="message-box">
        <h2>Rätsel gelöst!</h2>
        <p>Du hast ${pointsEarned} Punkte erhalten.</p>
        ${currentRiddle.wikipedia ? `<p><a href="${currentRiddle.wikipedia}" target="_blank">Mehr über diesen Ort erfahren</a></p>` : ''}
        <button id="continueButton" class="btn btn-primary mt-3">Weiter</button>
      </div>
    `;
        document.body.appendChild(overlay);

        var continueButton = document.getElementById('continueButton');
        continueButton.addEventListener('click', function() {
            document.body.removeChild(overlay);
        });
    }

    // Funktion zur Anzeige, wenn alle Rätsel gelöst sind
    function showAllRiddlesSolvedMessage() {
        var overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.innerHTML = `
      <div class="message-box">
        <h2>Alle Rätsel gelöst!</h2>
        <p>Herzlichen Glückwunsch, du hast alle Rätsel gelöst!</p>
        <button id="goHomeButton" class="btn btn-success mt-3">Zur Startseite</button>
      </div>
    `;
        document.body.appendChild(overlay);

        var goHomeButton = document.getElementById('goHomeButton');
        goHomeButton.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }

    // Funktion zum Hinzufügen von Achievements
    function addAchievement(achievement) {
        var achievements = JSON.parse(localStorage.getItem('achievements')) || [];
        if (!achievements.includes(achievement)) {
            achievements.push(achievement);
            localStorage.setItem('achievements', JSON.stringify(achievements));
        }
    }

    // Funktion zum Starten einer Runde
    function startRound() {
        if (round > maxRounds) {
            endGame();
            return;
        }

        // Starte das nächste Rätsel
        loadNextRiddle();

        // Starte den Timer
        startTimer();

        // Aktualisiere das Runden-UI
        updateRoundUI();
    }

    // Funktion zum Starten des Timers
    function startTimer() {
        var timeLeft = roundDuration;
        updateTimerDisplay(timeLeft);

        roundTimer = setInterval(function() {
            timeLeft -= 1000;
            updateTimerDisplay(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(roundTimer);
                timerEnded();
            }
        }, 1000);
    }

    // Funktion zum Aktualisieren der Timeranzeige
    function updateTimerDisplay(time) {
        var timerElement = document.getElementById('timer');
        if (timerElement) {
            var minutes = Math.floor(time / 60000);
            var seconds = ((time % 60000) / 1000).toFixed(0);
            timerElement.innerText = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        }
    }

    // Funktion, die aufgerufen wird, wenn der Timer endet
    function timerEnded() {
        // Zeige die Lösung an
        showSolution();

        // Berechne Punkte basierend auf der Entfernung
        calculatePoints();

        // Zeige den "Weiter"-Button
        showContinueButton();
    }

    // Funktion zur Punktberechnung
    function calculatePoints() {
        navigator.geolocation.getCurrentPosition(function(position) {
            var userLat = position.coords.latitude;
            var userLon = position.coords.longitude;

            var treasureLat = currentRiddle.latitude;
            var treasureLon = currentRiddle.longitude;

            // Berechne die Entfernung in Kilometern
            var distance = getDistanceFromLatLonInKm(userLat, userLon, treasureLat, treasureLon);

            // Punktevergabe (Beispielberechnung)
            var pointsEarned = Math.max(0, 100 - distance * 10); // Weniger Punkte bei größerer Entfernung
            points += Math.round(pointsEarned);
            updatePointsDisplay();
        });
    }

    // Haversine-Formel zur Berechnung der Distanz
    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radius der Erde in km
        var dLat = deg2rad(lat2 - lat1);
        var dLon = deg2rad(lat2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    // Funktion zum Anzeigen des "Weiter"-Buttons
    function showContinueButton() {
        var continueButton = document.getElementById('continueButton');
        if (continueButton) {
            continueButton.style.display = 'block';
            continueButton.addEventListener('click', function() {
                // Nächste Runde starten
                continueButton.style.display = 'none';
                round++;
                startRound();
            });
        }
    }

    // Funktion zum Beenden des Spiels
    function endGame() {
        alert('Spiel beendet! Du hast insgesamt ' + points + ' Punkte erreicht.');
        // Zeige Optionen für neues Spiel oder zur Startseite
        showEndGameOptions();
    }

    // Funktion zum Laden des nächsten Rätsels
    function loadNextRiddle() {
        // Deine bestehende Logik zum Laden eines Rätsels
    }

    // Funktion zum Aktualisieren des Runden-UI
    function updateRoundUI() {
        var roundElement = document.getElementById('round');
        if (roundElement) {
            roundElement.innerText = 'Runde: ' + round + ' / ' + maxRounds;
        }
    }

    // Funktion zum Anzeigen der Endgame-Optionen
    function showEndGameOptions() {
        var endGameOptions = document.getElementById('endGameOptions');
        if (endGameOptions) {
            endGameOptions.style.display = 'block';
        }
    }

    // Starte das Spiel
    startRound();
});
