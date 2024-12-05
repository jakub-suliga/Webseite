// Scripts/maps.js

document.addEventListener('DOMContentLoaded', () => {
    let riddles = [];
    let solvedRiddles = JSON.parse(localStorage.getItem('solvedRiddles')) || [];
    let points = 0;
    let currentRiddle = {};
    let hintsUsed = { text: 0, direction: 0, radius: 0, vibrate: 0 };
    const maxHints = 3;
    let userMarker = null;
    let directionLine = null;
    let directionArrow = null;
    let radiusCircle = null;
    let hintsAvailable = [];
    let selectedCategories = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    let currentCity = null;
    let treasureMarker = null;
    let solutionLine = null;
    let solutionArrow = null;
    let positionUpdateInterval = null; // Für die kontinuierliche Geolokalisierung

    let round = 1;
    let totalDistance = 0;
    let roundTimer = null;

    // Einstellungen aus dem localStorage laden
    const gameTime = parseInt(localStorage.getItem('gameTime'), 10) || 5; // In Minuten
    const maxDistance = parseFloat(localStorage.getItem('maxDistance')) || 1; // In Kilometern
    const maxRounds = parseInt(localStorage.getItem('numRounds'), 10) || 3;

    // Berechnung der Rundenzeit in Millisekunden
    const roundDuration = gameTime * 60 * 1000;

    // Initialisiere die Karte
    const map = L.map('map');

    // OpenStreetMap-Tiles einbinden
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap-Mitwirkende',
    }).addTo(map);

    // Punkteanzeige
    const pointsDisplay = L.control({ position: 'topright' });
    pointsDisplay.onAdd = () => {
        const div = L.DomUtil.create('div', 'points-display');
        div.innerHTML = `Punkte: <span id="pointsCount">${points}</span>`;
        return div;
    };
    pointsDisplay.addTo(map);

    // Update der Punkteanzeige
    function updatePointsDisplay() {
        const pointsCountElement = document.getElementById('pointsCount');
        if (pointsCountElement) {
            pointsCountElement.innerText = points;
        }
    }

    // Stadtgrenzen (erweitert)
    const cityBoundaries = {
        Karlsruhe: { latMin: 48.9, latMax: 49.1, lonMin: 8.3, lonMax: 8.6 },
        Stuttgart: { latMin: 48.72, latMax: 48.83, lonMin: 9.08, lonMax: 9.27 },
    };

    // Start der Geolokalisierung
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                console.log(`Aktuelle Position: Lat ${userLat}, Lon ${userLon}`);
                currentCity = getCurrentCity(userLat, userLon);
                console.log(`Erkannte Stadt: ${currentCity}`);

                if (currentCity) {
                    map.setView([userLat, userLon], 18);
                    userMarker = L.marker([userLat, userLon])
                        .addTo(map)
                        .bindPopup('Deine Position')
                        .openPopup();
                    loadRiddles();

                    // Start watching the user's position every 1 second
                    startWatchingPosition();
                } else {
                    alert('Es gibt keine Rätsel für Ihren aktuellen Standort.');
                    window.location.href = 'index.html';
                }
            },
            (error) => {
                console.error('Fehler bei der Standortbestimmung:', error);
                alert('Um dieses Spiel zu spielen, muss der Standortzugriff erlaubt sein.');
                window.location.href = 'index.html';
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    } else {
        alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
        window.location.href = 'index.html';
    }

    // Position alle 1 Sekunde aktualisieren
    function startWatchingPosition() {
        if (navigator.geolocation) {
            positionUpdateInterval = setInterval(() => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLat = position.coords.latitude;
                        const userLon = position.coords.longitude;

                        // Update user marker position
                        if (userMarker) {
                            userMarker.setLatLng([userLat, userLon]);
                        } else {
                            userMarker = L.marker([userLat, userLon])
                                .addTo(map)
                                .bindPopup('Deine Position')
                                .openPopup();
                        }
                    },
                    showError,
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
                );
            }, 1000); // Aktualisierung alle 1 Sekunde
        } else {
            alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
            window.location.href = 'index.html';
        }
    }

    // Hilfsfunktionen
    function getCurrentCity(lat, lon) {
        for (const city in cityBoundaries) {
            const bounds = cityBoundaries[city];
            if (
                lat >= bounds.latMin &&
                lat <= bounds.latMax &&
                lon >= bounds.lonMin &&
                lon <= bounds.lonMax
            ) {
                return city;
            }
        }
        return null;
    }

    function loadRiddles() {
        fetch('Data/riddles.json')
            .then((response) => {
                if (!response.ok) throw new Error('Netzwerkantwort war nicht ok');
                return response.json();
            })
            .then((data) => {
                console.log(`Gesamtzahl der Rätsel: ${data.riddles.length}`);
                riddles = data.riddles
                    .filter((riddle) => riddle.city === currentCity)
                    .filter((riddle) =>
                        selectedCategories.length > 0
                            ? selectedCategories.includes(riddle.category)
                            : true
                    )
                    .filter((riddle) => !solvedRiddles.includes(riddle.id));

                console.log(`Rätsel nach Stadt und Kategorie: ${riddles.length}`);

                // Filtern nach Entfernung
                riddles = riddles.filter((riddle) => {
                    const distance = getDistance(
                        userMarker.getLatLng().lat,
                        userMarker.getLatLng().lng,
                        riddle.latitude,
                        riddle.longitude
                    ) / 1000; // Entfernung in Kilometern
                    return distance <= maxDistance;
                });

                console.log(`Rätsel nach Entfernung: ${riddles.length}`);

                if (riddles.length > 0) {
                    startRound();
                } else {
                    alert(
                        'Es gibt keine verfügbaren Rätsel innerhalb der eingestellten Entfernung für Ihren Standort und die ausgewählten Kategorien.'
                    );
                    window.location.href = 'index.html';
                }
            })
            .catch((error) => {
                console.error('Fehler beim Laden der Rätsel:', error);
                document.getElementById('currentRiddle').innerText =
                    'Fehler beim Laden der Rätsel.';
            });
    }

    function startRound() {
        if (round > maxRounds || riddles.length === 0) {
            endGame();
            return;
        }

        loadNextRiddle();
        startTimer();
        updateRoundUI();
    }

    function loadNextRiddle() {
        if (riddles.length === 0) {
            endGame();
            return;
        }
        currentRiddle = getRandomRiddle();
        displayRiddle();
    }

    function getRandomRiddle() {
        if (riddles.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * riddles.length);
        return riddles.splice(randomIndex, 1)[0]; // Entfernt das Rätsel aus dem Array
    }

    function displayRiddle() {
        if (!currentRiddle || !currentRiddle.question) {
            console.error('Ungültiges Rätsel:', currentRiddle);
            document.getElementById('currentRiddle').innerText = 'Kein gültiges Rätsel gefunden.';
            return;
        }

        document.getElementById('currentRiddle').innerText = currentRiddle.question;
        document.getElementById('currentHint').innerText = '';
        document.getElementById('riddleAnswer').style.display = 'none';
        document.getElementById('answerText').innerText = '';

        hintsUsed = { text: 0, direction: 0, radius: 0, vibrate: 0 };
        hintsAvailable = [...currentRiddle.hints];
        updatePointsDisplay();
        enableHintButtons();

        // "Standort einloggen" Button anzeigen
        const logLocationButton = document.getElementById('logLocationButton');
        if (logLocationButton) {
            logLocationButton.style.display = 'block';
        }
    }

    function startTimer() {
        let timeLeft = roundDuration;
        updateTimerDisplay(timeLeft);

        roundTimer = setInterval(() => {
            timeLeft -= 1000;
            updateTimerDisplay(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(roundTimer);
                timeLeft = 0;
                updateTimerDisplay(timeLeft);
                timerEnded();
            }
        }, 1000);
    }

    function updateTimerDisplay(time) {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            const minutes = Math.floor(time / 60000);
            const seconds = ((time % 60000) / 1000).toFixed(0);
            timerElement.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

            // Wenn weniger als 1 Minute übrig ist
            if (time <= 60000) {
                timerElement.style.color = 'red';
                timerElement.style.fontSize = '24px';
            } else {
                timerElement.style.color = 'black';
                timerElement.style.fontSize = '18px';
            }
        }
    }

    function timerEnded() {
        logPlayerLocation(); // Automatisch Standort einloggen
    }

    function logPlayerLocation() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                const treasureLat = currentRiddle.latitude;
                const treasureLon = currentRiddle.longitude;

                const distance = getDistance(userLat, userLon, treasureLat, treasureLon) / 1000; // in Kilometern
                totalDistance += distance;

                const pointsEarned = Math.max(0, 100 - distance * 10);
                points += Math.round(pointsEarned);
                updatePointsDisplay();

                showSolution();

                // Lösung anzeigen und Linie zeichnen
                if (treasureMarker) {
                    map.removeLayer(treasureMarker);
                }
                treasureMarker = L.marker([treasureLat, treasureLon])
                    .addTo(map)
                    .bindPopup('Lösung');

                if (solutionLine) {
                    map.removeLayer(solutionLine);
                }
                if (solutionArrow) {
                    map.removeLayer(solutionArrow);
                }
                solutionLine = L.polyline(
                    [
                        [userLat, userLon],
                        [treasureLat, treasureLon],
                    ],
                    { color: 'green', dashArray: '5, 10' }
                ).addTo(map);

                solutionArrow = L.polylineDecorator(solutionLine, {
                    patterns: [
                        {
                            offset: '100%',
                            repeat: 0,
                            symbol: L.Symbol.arrowHead({
                                pixelSize: 15,
                                polygon: false,
                                pathOptions: { stroke: true, color: 'green', weight: 2 },
                            }),
                        },
                    ],
                }).addTo(map);

                // Karte anpassen
                map.fitBounds([
                    [userLat, userLon],
                    [treasureLat, treasureLon],
                ]);

                // Button anpassen
                const logLocationButton = document.getElementById('logLocationButton');
                if (logLocationButton) {
                    logLocationButton.style.display = 'none';
                }
                showContinueButton();
            },
            showError,
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    }

    function showSolution() {
        const answerText = document.getElementById('answerText');
        answerText.innerText = currentRiddle.answer;
        document.getElementById('riddleAnswer').style.display = 'block';
    }

    function showContinueButton() {
        const continueButton = document.getElementById('continueButton');
        if (continueButton) {
            continueButton.style.display = 'block';
            continueButton.addEventListener('click', () => {
                continueButton.style.display = 'none';

                // Marker und Linie entfernen
                if (treasureMarker) {
                    map.removeLayer(treasureMarker);
                    treasureMarker = null;
                }
                if (solutionLine) {
                    map.removeLayer(solutionLine);
                    solutionLine = null;
                }
                if (solutionArrow) {
                    map.removeLayer(solutionArrow);
                    solutionArrow = null;
                }

                // Hinweise von der Karte entfernen
                clearMapHints();

                round++;
                startRound();
            });
        }
    }

    function endGame() {
        // Durchschnittliche Entfernung berechnen
        const avgDistance = (totalDistance / maxRounds).toFixed(2);
        alert(`Spiel beendet! Du hast insgesamt ${points} Punkte erreicht.
Durchschnittliche Entfernung zum Ziel: ${avgDistance} km`);

        // Geolokalisierung stoppen
        if (positionUpdateInterval !== null) {
            clearInterval(positionUpdateInterval);
            positionUpdateInterval = null;
        }

        // Statistiken speichern
        localStorage.setItem('points', points);

        // Weiterleitung zur Statistikseite
        window.location.href = 'achievements.html';
    }

    function updateRoundUI() {
        const roundElement = document.getElementById('round');
        if (roundElement) {
            roundElement.innerText = `Runde: ${round} / ${maxRounds}`;
        }
    }

    // Hinweis-Buttons und ihre Event Listener
    const hintButton = document.getElementById('hintButton');
    const hintMenu = document.getElementById('hintMenu');
    if (hintButton) {
        hintButton.addEventListener('click', () => hintMenu.classList.toggle('show'));
    }

    const textHintButton = document.getElementById('textHintButton');
    const directionHintButton = document.getElementById('directionHintButton');
    const radiusHintButton = document.getElementById('radiusHintButton');
    const vibrateHintButton = document.getElementById('vibrateHintButton');

    if (textHintButton) {
        textHintButton.addEventListener('click', () => {
            if (hintsUsed.text < maxHints && hintsAvailable.length > 0) {
                hintsUsed.text++;
                const hintText = hintsAvailable.shift();
                const currentHintElement = document.getElementById('currentHint');
                currentHintElement.innerText += `Hinweis ${hintsUsed.text}: ${hintText}\n`;
                updatePointsDisplay();
            }
            if (hintsUsed.text >= maxHints || hintsAvailable.length === 0)
                disableButton(textHintButton);
        });
    }

    if (directionHintButton) {
        directionHintButton.addEventListener('click', () => {
            if (hintsUsed.direction < maxHints) {
                hintsUsed.direction++;
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLat = position.coords.latitude;
                        const userLon = position.coords.longitude;

                        if (directionLine) map.removeLayer(directionLine);
                        if (directionArrow) map.removeLayer(directionArrow);

                        // Zufällige Abweichung von bis zu 20 Grad
                        const randomAngle = (Math.random() * 40 - 20) * (Math.PI / 180); // in Radianten

                        const bearing = getBearing(
                            userLat,
                            userLon,
                            currentRiddle.latitude,
                            currentRiddle.longitude
                        );

                        const adjustedBearing = bearing + randomAngle;

                        const distance = 1000; // 1 km Linie

                        const endPoint = computeDestinationPoint(
                            userLat,
                            userLon,
                            adjustedBearing,
                            distance
                        );

                        directionLine = L.polyline(
                            [
                                [userLat, userLon],
                                [endPoint.lat, endPoint.lon],
                            ],
                            { color: 'blue', dashArray: '5, 10' }
                        ).addTo(map);

                        directionArrow = L.polylineDecorator(directionLine, {
                            patterns: [
                                {
                                    offset: '100%',
                                    repeat: 0,
                                    symbol: L.Symbol.arrowHead({
                                        pixelSize: 15,
                                        polygon: false,
                                        pathOptions: { stroke: true, color: 'blue', weight: 2 },
                                    }),
                                },
                            ],
                        }).addTo(map);

                        map.fitBounds(directionLine.getBounds());
                        updatePointsDisplay();
                    },
                    showError,
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
                );
            }
            if (hintsUsed.direction >= maxHints) disableButton(directionHintButton);
        });
    }

    if (radiusHintButton) {
        radiusHintButton.addEventListener('click', () => {
            if (hintsUsed.radius < maxHints) {
                hintsUsed.radius++;
                const radiusValues = [1000, 500, 200];
                const radius = radiusValues[hintsUsed.radius - 1] || 100;

                // Zufällige Position innerhalb eines Kreises um das Ziel
                const randomDistance = Math.random() * radius;
                const randomAngle = Math.random() * 2 * Math.PI;

                const offsetLat =
                    currentRiddle.latitude +
                    (randomDistance * Math.cos(randomAngle)) / 111320; // Näherungsweise Umrechnung
                const offsetLon =
                    currentRiddle.longitude +
                    (randomDistance * Math.sin(randomAngle)) /
                        (111320 * Math.cos((currentRiddle.latitude * Math.PI) / 180));

                if (radiusCircle) map.removeLayer(radiusCircle);
                radiusCircle = L.circle([offsetLat, offsetLon], {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 0.1,
                    radius,
                }).addTo(map);
                updatePointsDisplay();
            }
            if (hintsUsed.radius >= maxHints) disableButton(radiusHintButton);
        });
    }

    if (vibrateHintButton) {
        vibrateHintButton.addEventListener('click', () => {
            if (hintsUsed.vibrate < maxHints) {
                hintsUsed.vibrate++;
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLat = position.coords.latitude;
                        const userLon = position.coords.longitude;
                        const distance = getDistance(
                            userLat,
                            userLon,
                            currentRiddle.latitude,
                            currentRiddle.longitude
                        );

                        const vibrationDuration = calculateVibrationDuration(distance);
                        vibrateDevice(vibrationDuration);
                    },
                    showError,
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
                );
            }
            if (hintsUsed.vibrate >= maxHints) disableButton(vibrateHintButton);
        });
    }

    function enableHintButtons() {
        [textHintButton, directionHintButton, radiusHintButton, vibrateHintButton].forEach(
            (btn) => {
                btn.disabled = false;
                btn.style.opacity = 1;
            }
        );
    }

    function disableButton(button) {
        button.disabled = true;
        button.style.opacity = 0.5;
    }

    function clearMapHints() {
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
    }

    function showError(error) {
        console.error('Fehler bei der Standortbestimmung:', error);
    }

    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Erdradius in Metern
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Entfernung in Metern
    }

    // Berechnet den initialen Kurs (Bearing) zwischen zwei Punkten
    function getBearing(lat1, lon1, lat2, lon2) {
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const λ1 = (lon1 * Math.PI) / 180;
        const λ2 = (lon2 * Math.PI) / 180;

        const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
        const x =
            Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);

        return Math.atan2(y, x);
    }

    // Berechnet einen neuen Punkt basierend auf einem Startpunkt, einem Winkel und einer Entfernung
    function computeDestinationPoint(lat, lon, bearing, distance) {
        const R = 6371e3; // Erdradius in Metern
        const δ = distance / R; // Winkeldistanz in Radianten
        const θ = bearing;

        const φ1 = (lat * Math.PI) / 180;
        const λ1 = (lon * Math.PI) / 180;

        const φ2 = Math.asin(
            Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
        );
        const λ2 =
            λ1 +
            Math.atan2(
                Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
                Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
            );

        return { lat: (φ2 * 180) / Math.PI, lon: (λ2 * 180) / Math.PI };
    }

    function calculateVibrationDuration(distance) {
        const maxDistance = 2000; // 2 km
        const minDuration = 200; // ms
        const maxDuration = 1000; // ms

        if (distance > maxDistance) {
            return minDuration;
        } else {
            const duration =
                maxDuration - (distance / maxDistance) * (maxDuration - minDuration);
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

    // "Standort einloggen" Button
    const logLocationButton = document.getElementById('logLocationButton');
    if (logLocationButton) {
        logLocationButton.addEventListener('click', () => {
            clearInterval(roundTimer);
            logPlayerLocation();
        });
    }

    // Entferne den "Show Solution" Button (falls vorhanden)
    const showSolutionButton = document.getElementById('showSolutionButton');
    if (showSolutionButton) {
        showSolutionButton.style.display = 'none';
    }
});

