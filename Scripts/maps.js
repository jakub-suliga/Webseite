// Scripts/maps.js

document.addEventListener('DOMContentLoaded', () => {
    // Holds all riddles initially loaded from JSON
    let allRiddles = [];
    // Holds currently available riddles after initial filtering
    let riddles = [];
    // Holds all solved riddle IDs
    let solvedRiddles = JSON.parse(localStorage.getItem('solvedRiddles')) || [];
    // Current score and round-related data
    let points = 0;
    let currentRiddle = null;
    let hintsUsed = { text: 0, direction: 0, radius: 0 };
    let totalHintsUsed = JSON.parse(localStorage.getItem('totalHintsUsed')) || { text: 0, direction: 0, radius: 0 };
    const maxHints = 3;
    let userMarker = null;
    let directionLine = null;
    let radiusCircle = null;
    let hintsAvailable = [];
    let currentCity = null;
    let treasureMarker = null;
    let solutionLine = null;
    let solutionArrow = null;
    let positionUpdateInterval = null;

    let round = 1;
    let totalDistance = 0;
    let totalPoints = parseInt(localStorage.getItem('totalPoints'), 10) || 0;
    let gamesPlayed = parseInt(localStorage.getItem('gamesPlayed'), 10) || 0;
    let roundTimer = null;

    // Game settings from localStorage or defaults
    const gameTime = parseInt(localStorage.getItem('gameTime'), 10) || 5;
    const maxDistance = parseFloat(localStorage.getItem('maxDistance')) || 1;
    const maxRounds = parseInt(localStorage.getItem('numRounds'), 10) || 3;

    const roundDuration = gameTime * 60 * 1000;

    // Since now only Karlsruhe is available, we only keep Karlsruhe boundaries
    const cityBoundaries = {
        Karlsruhe: { latMin: 48.9, latMax: 49.1, lonMin: 8.3, lonMax: 8.6 }
    };

    let deviceOrientationFan = null;
    let currentHeading = null;

    const map = L.map('map', { zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // UI elements
    const currentRiddleElement = document.getElementById('currentRiddle');
    const currentHintElement = document.getElementById('currentHint');
    const riddleAnswerElement = document.getElementById('riddleAnswer');
    const answerTextElement = document.getElementById('answerText');
    const logLocationButton = document.getElementById('logLocationButton');
    const continueButton = document.getElementById('continueButton');
    const hintButton = document.getElementById('hintButton');
    const hintMenu = document.getElementById('hintMenu');
    const textHintButton = document.getElementById('textHintButton');
    const directionHintButton = document.getElementById('directionHintButton');
    const radiusHintButton = document.getElementById('radiusHintButton');
    const timerElement = document.getElementById('timer');
    const roundElement = document.getElementById('round');
    const modal = document.getElementById('messageModal');
    const modalMessage = document.getElementById('modalMessage');
    const modalButton1 = document.getElementById('modalButton1');
    const modalButton2 = document.getElementById('modalButton2');
    const roundPointsEl = document.getElementById('roundPoints');

    // Optional tutorial elements
    const tutorialBox = document.querySelector('.tutorial-box');
    const tutorialContent = tutorialBox ? tutorialBox.querySelector('.tutorial-content') : null;
    const tutorialCloseButton = tutorialBox ? document.getElementById('tutorialCloseButton') : null;
    const tutorialCheckbox = tutorialBox ? document.getElementById('showTutorialCheckbox') : null;

    // Load specfic riddles once
    function initialLoadOfRiddles() {
        return fetch('Data/riddles.json')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                // Store all riddles without filtering
                allRiddles = data.riddles;
                if (userMarker) {
                    const userLat = userMarker.getLatLng().lat;
                    const userLon = userMarker.getLatLng().lng;

                    riddles = allRiddles.filter(r => !solvedRiddles.includes(r.id))
                        .filter(r => {
                            const dist = getDistance(userLat, userLon, r.latitude, r.longitude) / 1000;
                            return dist <= maxDistance;
                        });
                } else {
                    riddles = allRiddles.filter(r => !solvedRiddles.includes(r.id));
                }
            })
            .catch(error => {
                console.error('Error loading riddles:', error);
                if (currentRiddleElement) currentRiddleElement.innerText = 'Error loading riddles.';
            });
    }

    // Show tutorial if needed, otherwise start round
    function showInstructions() {
        if (!tutorialBox || !tutorialContent || !tutorialCloseButton || !tutorialCheckbox) {
            startRound();
            return;
        }

        const instructions = `
        <h3>Willkommen bei der Schatzsuche!</h3>
        <p>Du erhältst Rätsel, die dich zu realen Orten führen.</p>
        <p><strong>So funktioniert es:</strong></p>
        <ul>
            <li>Du bekommst ein Rätsel, das auf einen bestimmten Ort in Karlsruhe hinweist.</li>
            <li>Verwende Hinweise bei Bedarf, jeder Hinweis kostet 100 Punkte.</li>
            <li>Je näher du bist, wenn du deine Position loggst, desto mehr Punkte erhältst du. Maximal 1000 Punkte</li>
            <li>Klicke auf "Standort loggen", wenn du glaubst, am richtigen Ort zu sein.</li>
            <li>Nach jeder Runde klicke auf "Weiter" für das nächste Rätsel.</li>
        </ul>
        <p><strong>Hinweise:</strong></p>
        <ul>
            <li><strong>Text Hinweis:</strong> Zusätzliche textuelle Hinweise.</li>
            <li><strong>Richtungs Hinweis:</strong> Ein Sektor, der die ungefähre Richtung anzeigt.</li>
            <li><strong>Radius Hinweis:</strong> Ein Kreis, der den ungefähren Bereich zeigt.</li>
        </ul>
        <p>Viel Spaß!</p>
        `;
        tutorialContent.innerHTML = instructions;
        tutorialBox.style.display = 'flex';

        tutorialCloseButton.onclick = () => {
            tutorialBox.style.display = 'none';
            localStorage.setItem('showTutorial', !tutorialCheckbox.checked);
            startRound();
        };
    }

    // Start a new round or end the game if no riddles remain
    function startRound() {
        if (round > maxRounds || riddles.length === 0) {
            endGame();
            return;
        }
        loadNextRiddle();
        startTimer();
        updateRoundUI();
    }

    // Select a random riddle from the available list
    function loadNextRiddle() {
        if (riddles.length === 0) {
            endGame();
            return;
        }
        currentRiddle = getRandomRiddle();
        displayRiddle();
    }

    // Get a random riddle and remove it from the list
    function getRandomRiddle() {
        if (riddles.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * riddles.length);
        return riddles.splice(randomIndex, 1)[0];
    }

    // Show the current riddle on screen
    function displayRiddle() {
        if (!currentRiddle || !currentRiddle.question) return;
        if (currentRiddleElement) currentRiddleElement.innerText = currentRiddle.question;
        if (currentHintElement) currentHintElement.innerText = '';
        if (riddleAnswerElement) riddleAnswerElement.style.display = 'none';
        if (answerTextElement) answerTextElement.innerText = '';

        hintsUsed = { text: 0, direction: 0, radius: 0 };
        hintsAvailable = currentRiddle.hints ? [...currentRiddle.hints] : [];
        updatePointsDisplay();

        enableHintButtons();

        if (logLocationButton) logLocationButton.style.display = 'block';
        if (continueButton) continueButton.style.display = 'none';
    }

    // Enable all hint buttons
    function enableHintButtons() {
        [textHintButton, directionHintButton, radiusHintButton].forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = 1;
            }
        });
        if (hintButton) {
            hintButton.disabled = false;
            hintButton.style.opacity = 1;
        }
    }

    // Start the round timer
    function startTimer() {
        let timeLeft = roundDuration;
        updateTimerDisplay(timeLeft);

        roundTimer = setInterval(() => {
            timeLeft -= 1000;
            if (timeLeft < 0) timeLeft = 0;
            updateTimerDisplay(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(roundTimer);
                timerEnded();
            }
        }, 1000);
    }

    // Update the displayed timer
    function updateTimerDisplay(time) {
        const minutes = Math.floor(time / 60000);
        const seconds = ((time % 60000) / 1000).toFixed(0);
        timerElement.innerText = `Zeit: ${minutes}:${(seconds < 10 ? '0' : '') + seconds}`;

        if (time <= 60000) {
            timerElement.style.color = 'red';
            timerElement.style.fontSize = '24px';
        } else {
            timerElement.style.color = 'black';
            timerElement.style.fontSize = '18px';
        }
    }

    // Called when the timer runs out, log player's location automatically
    function timerEnded() {
        logPlayerLocation();
    }

    // Log player's current location and calculate points
    function logPlayerLocation() {
        if (!userMarker) {
            console.error('Keine bekannte Benutzerposition verfügbar.');
            showMessage('Standort kann nicht geloggt werden.', () => {});
            return;
        }

        const userLat = userMarker.getLatLng().lat;
        const userLon = userMarker.getLatLng().lng;
        const treasureLat = currentRiddle.latitude;
        const treasureLon = currentRiddle.longitude;

        const distance = getDistance(userLat, userLon, treasureLat, treasureLon);

        let basePoints = 1000 - ((hintsUsed.text + hintsUsed.direction + hintsUsed.radius) * 100);
        if (basePoints < 0) basePoints = 0;

        let finalPoints = 0;
        if (distance < 0.5) {
            finalPoints = 0;
        } else if (distance <= 50) {
            finalPoints = basePoints;
        } else {
            const maxDistForPoints = 500;
            if (distance >= maxDistForPoints) {
                finalPoints = 0;
            } else {
                const factor = 1 - ((distance - 50) / (maxDistForPoints - 50));
                finalPoints = Math.max(0, Math.floor(basePoints * factor));
            }
        }

        points += finalPoints;
        updatePointsDisplay();

        totalPoints += finalPoints;
        localStorage.setItem('totalPoints', totalPoints);

        totalHintsUsed.text += hintsUsed.text;
        totalHintsUsed.direction += hintsUsed.direction;
        totalHintsUsed.radius += hintsUsed.radius;
        localStorage.setItem('totalHintsUsed', JSON.stringify(totalHintsUsed));

        let totalRoundsPlayed = parseInt(localStorage.getItem('totalRoundsPlayed'), 10) || 0;
        totalRoundsPlayed++;
        localStorage.setItem('totalRoundsPlayed', totalRoundsPlayed);

        let storedTotalDistance = parseFloat(localStorage.getItem('totalDistance')) || 0;
        storedTotalDistance += (distance / 1000);
        localStorage.setItem('totalDistance', storedTotalDistance);

        // Mark the riddle as solved
        solvedRiddles.push(currentRiddle.id);
        localStorage.setItem('solvedRiddles', JSON.stringify(solvedRiddles));

        showSolution(userLat, userLon, treasureLat, treasureLon);
        if (logLocationButton) logLocationButton.style.display = 'none';
        if (continueButton) continueButton.style.display = 'block';

        if (roundPointsEl) {
            roundPointsEl.innerText = `Rundenpunkte: ${finalPoints}`;
        }

        disableAllHintButtons();

        if (hintMenu && hintMenu.classList.contains('show')) {
            hintMenu.classList.remove('show');
        }
    }

    // Disable all hint buttons
    function disableAllHintButtons() {
        [textHintButton, directionHintButton, radiusHintButton].forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = 0.5;
            }
        });
        if (hintButton) {
            hintButton.disabled = true;
            hintButton.style.opacity = 0.5;
        }
    }

    // Show the solution on the map
    function showSolution(userLat, userLon, treasureLat, treasureLon) {
        if (answerTextElement) answerTextElement.innerText = currentRiddle.answer;
        if (riddleAnswerElement) riddleAnswerElement.style.display = 'block';

        if (logLocationButton) logLocationButton.style.display = 'none';
        if (continueButton) continueButton.style.display = 'block';

        if (treasureMarker) map.removeLayer(treasureMarker);
        treasureMarker = L.marker([treasureLat, treasureLon]).addTo(map).bindPopup('Lösung');

        if (solutionLine) map.removeLayer(solutionLine);
        if (solutionArrow) map.removeLayer(solutionArrow);

        solutionLine = L.polyline([[userLat, userLon], [treasureLat, treasureLon]], { color: 'green', dashArray: '5, 10' }).addTo(map);
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

        map.fitBounds([[userLat, userLon], [treasureLat, treasureLon]]);
    }

    if (continueButton) {
        continueButton.onclick = () => {
            continueButton.style.display = 'none';
            clearMapHints();
            if (treasureMarker) { map.removeLayer(treasureMarker); treasureMarker = null; }
            if (solutionLine) { map.removeLayer(solutionLine); solutionLine = null; }
            if (solutionArrow) { map.removeLayer(solutionArrow); solutionArrow = null; }

            if (hintMenu && hintMenu.classList.contains('show')) {
                hintMenu.classList.remove('show');
            }

            // Weiter zur nächsten Runde ohne erneutes Filtern
            round++;
            startRound();
        };
    }

    // End the game and show a summary
    function endGame() {
        const avgDistance = (totalDistance / maxRounds).toFixed(2);
        const avgPointsPerRound = (points / maxRounds).toFixed(2);
        const message = `Spiel beendet! Du hast insgesamt ${points} Punkte erreicht.
Durchschnittliche Entfernung: ${avgDistance} km
Durchschnittliche Punkte pro Runde: ${avgPointsPerRound}`;

        if (positionUpdateInterval !== null) {
            clearInterval(positionUpdateInterval);
            positionUpdateInterval = null;
        }

        gamesPlayed += 1;
        localStorage.setItem('gamesPlayed', gamesPlayed);
        localStorage.setItem('points', points);

        showEndGameMessage(message);
    }

    // Reset the game state
    function resetGame() {
        // Stop any existing timers or intervals
        if (roundTimer) {
            clearInterval(roundTimer);
            roundTimer = null;
        }
        if (positionUpdateInterval !== null) {
            clearInterval(positionUpdateInterval);
            positionUpdateInterval = null;
        }

        // Reset game variables
        round = 1;
        points = 0;
        totalDistance = 0;
        riddles = [];
        solvedRiddles = [];
        localStorage.setItem('solvedRiddles', JSON.stringify(solvedRiddles));

        // Reset hints
        hintsUsed = { text: 0, direction: 0, radius: 0 };
        totalHintsUsed = { text: 0, direction: 0, radius: 0 };
        localStorage.setItem('totalHintsUsed', JSON.stringify(totalHintsUsed));

        // Clear map hints and markers
        clearMapHints();
        if (treasureMarker) { map.removeLayer(treasureMarker); treasureMarker = null; }
        if (solutionLine) { map.removeLayer(solutionLine); solutionLine = null; }
        if (solutionArrow) { map.removeLayer(solutionArrow); solutionArrow = null; }

        if (deviceOrientationFan) { map.removeLayer(deviceOrientationFan); deviceOrientationFan = null; }

        // Reset UI elements
        updatePointsDisplay();
        updateRoundUI();
        if (currentRiddleElement) currentRiddleElement.innerText = '';
        if (currentHintElement) currentHintElement.innerText = '';
        if (riddleAnswerElement) riddleAnswerElement.style.display = 'none';
        if (answerTextElement) answerTextElement.innerText = '';
        if (roundPointsEl) roundPointsEl.innerText = '';

        // Reset modal visibility
        if (modal) modal.style.display = 'none';

        // Re-initialize the riddles
        riddles = allRiddles.filter(r => !solvedRiddles.includes(r.id))
                           .filter(r => {
                               const userLat = userMarker.getLatLng().lat;
                               const userLon = userMarker.getLatLng().lng;
                               const dist = getDistance(userLat, userLon, r.latitude, r.longitude) / 1000;
                               return dist <= maxDistance;
                           });

        // Start watching the position again
        startWatchingPosition();

        // Start the game
        startRound();
    }

    // Update UI elements for rounds and points
    function updateRoundUI() {
        if (roundElement) roundElement.innerText = `Runde: ${round} / ${maxRounds}`;
        const pointsElement = document.getElementById('points');
        if (pointsElement) pointsElement.innerText = `Punkte: ${points}`;
    }

    function disableButton(button) {
        if (!button) return;
        button.disabled = true;
        button.style.opacity = 0.5;
    }

    // Handle text hints
    function handleTextHint() {
        if (!textHintButton || !currentHintElement) return;
        if (hintsUsed.text < maxHints && hintsAvailable.length > 0) {
            hintsUsed.text++;
            const hintText = hintsAvailable.shift();
            currentHintElement.innerText += `Hinweis ${hintsUsed.text}: ${hintText}\n`;
            updatePointsDisplay();
        }
        if (hintsUsed.text >= maxHints || hintsAvailable.length === 0) disableButton(textHintButton);
    }

    // Handle direction hints
    function handleDirectionHint() {
        if (hintsUsed.direction >= maxHints) return;
        hintsUsed.direction++;

        if (!userMarker) {
            console.log('Keine Benutzerposition verfügbar.');
            return;
        }

        const userLat = userMarker.getLatLng().lat;
        const userLon = userMarker.getLatLng().lng;

        if (directionLine) map.removeLayer(directionLine);

        const bearing = getBearing(userLat, userLon, currentRiddle.latitude, currentRiddle.longitude);

        // Increase length to 200m, base angle to 40°, second use reduces angle by 10° each time
        const radius = 200;
        const baseAngleDegrees = 40;
        const decreasePerUse = 10;
        const currentAngle = baseAngleDegrees - (hintsUsed.direction - 1)*decreasePerUse;
        const angleRange = currentAngle * (Math.PI / 180);

        const startAngle = bearing - angleRange;
        const endAngle = bearing + angleRange;
        const sectorPoints = [[userLat, userLon]];
        const numPoints = 30;
        for (let i = 0; i <= numPoints; i++) {
            const angle = startAngle + (i * (endAngle - startAngle) / numPoints);
            const endPoint = computeDestinationPoint(userLat, userLon, angle, radius);
            sectorPoints.push([endPoint.lat, endPoint.lon]);
        }
        sectorPoints.push([userLat, userLon]);

        clearMapHints();
        directionLine = L.polygon(sectorPoints, {
            color: 'blue',
            fillColor: 'blue',
            fillOpacity: 0.2
        }).addTo(map);

        map.fitBounds(directionLine.getBounds());
        updatePointsDisplay();
        if (hintsUsed.direction >= maxHints) disableButton(directionHintButton);
    }

    // Handle radius hints
    function handleRadiusHint() {
        if (!radiusHintButton || hintsUsed.radius >= maxHints) return;
        hintsUsed.radius++;

        const radiusValues = [1000, 500, 200];
        const radius = radiusValues[hintsUsed.radius - 1] || 100;

        const randomDistance = Math.random() * radius;
        const randomAngle = Math.random() * 2 * Math.PI;
        const offsetLat = currentRiddle.latitude + (randomDistance * Math.cos(randomAngle)) / 111320;
        const offsetLon = currentRiddle.longitude + (randomDistance * Math.sin(randomAngle)) / (111320 * Math.cos((currentRiddle.latitude * Math.PI) / 180));

        if (radiusCircle) map.removeLayer(radiusCircle);
        radiusCircle = L.circle([offsetLat, offsetLon], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.1,
            radius,
        }).addTo(map);

        map.fitBounds(radiusCircle.getBounds());
        updatePointsDisplay();
        if (hintsUsed.radius >= maxHints) disableButton(radiusHintButton);
    }

    // Remove any hint markers from the map
    function clearMapHints() {
        if (directionLine) { map.removeLayer(directionLine); directionLine = null; }
        if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
    }

    function showError(error) {
        console.error('Standortfehler:', error);
    }

    // Calculate distance between two coordinates in meters
    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ / 2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Calculate bearing from one coordinate to another
    function getBearing(lat1, lon1, lat2, lon2) {
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const λ1 = (lon1 * Math.PI) / 180;
        const λ2 = (lon2 * Math.PI) / 180;
        const y = Math.sin(λ2 - λ1)*Math.cos(φ2);
        const x = Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2 - λ1);
        return Math.atan2(y, x);
    }

    // Compute a destination point given start coords, bearing, and distance
    function computeDestinationPoint(lat, lon, bearing, distance) {
        const R = 6371e3;
        const δ = distance / R;
        const θ = bearing;

        const φ1 = (lat * Math.PI) / 180;
        const λ1 = (lon * Math.PI) / 180;

        const φ2 = Math.asin(Math.sin(φ1)*Math.cos(δ) + Math.cos(φ1)*Math.sin(δ)*Math.cos(θ));
        const λ2 = λ1 + Math.atan2(
            Math.sin(θ)*Math.sin(δ)*Math.cos(φ1),
            Math.cos(δ)-Math.sin(φ1)*Math.sin(φ2)
        );

        return { lat: (φ2 * 180) / Math.PI, lon: (λ2 * 180) / Math.PI };
    }

    function updatePointsDisplay() {
        const pointsElement = document.getElementById('points');
        if (pointsElement) pointsElement.innerText = `Punkte: ${points}`;
    }

    function showMessage(message, callback) {
        if (!modal || !modalMessage || !modalButton1) return;
        modalMessage.innerHTML = message;
        modal.style.display = 'block';
        modalButton2.style.display = 'none';

        modalButton1.innerText = 'OK';
        modalButton1.onclick = () => {
            modal.style.display = 'none';
            if (callback) callback();
        };
    }

    function showCustomMessage(message, buttonText, callback) {
        if (!modal || !modalMessage || !modalButton1) return;
        modalMessage.innerHTML = message;
        modal.style.display = 'block';
        modalButton2.style.display = 'none';
        modalButton1.innerText = buttonText;
        modalButton1.onclick = () => {
            modal.style.display = 'none';
            if (callback) callback();
        };
    }

    function showEndGameMessage(message) {
        if (!modal || !modalMessage || !modalButton1 || !modalButton2) return;
        modalMessage.innerText = message;
        modal.style.display = 'block';

        modalButton1.innerText = 'Zurück zum Start';
        modalButton2.innerText = 'Neues Spiel';
        modalButton2.style.display = 'inline-block';

        modalButton1.onclick = () => {
            modal.style.display = 'none';
            window.location.href = 'index.html';
        };

        modalButton2.onclick = () => {
            modal.style.display = 'none';
            resetGame();
        };
    }

    function startWatchingPosition() {
        if (!navigator.geolocation) {
            showMessage('Geolocation wird von deinem Browser nicht unterstützt.', () => {
                window.location.href = 'index.html';
            });
            return;
        }

        positionUpdateInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const userLat = position.coords.latitude;
                    const userLon = position.coords.longitude;
                    if (userMarker) {
                        userMarker.setLatLng([userLat, userLon]);
                    } else {
                        userMarker = L.marker([userLat, userLon])
                            .addTo(map)
                            .bindPopup('Deine Position')
                            .openPopup();
                    }
                    updateDeviceOrientationFan();
                },
                showError,
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        }, 1000);
    }

    // Update the device orientation fan angle and length
    function updateDeviceOrientationFan() {
        if (!userMarker || currentHeading === null) return;
        const userLat = userMarker.getLatLng().lat;
        const userLon = userMarker.getLatLng().lng;

        // Increase angle range per side to 20°, total 40°
        const angleRange = 20 * (Math.PI/180); 
        const startAngle = currentHeading - angleRange;
        const endAngle = currentHeading + angleRange;

        // Increase radius to 50m
        const radius = 50;

        const sectorPoints = [[userLat, userLon]];
        const numPoints = 10;
        for (let i = 0; i <= numPoints; i++) {
            const angle = startAngle + (i * (endAngle - startAngle) / numPoints);
            const endPoint = computeDestinationPoint(userLat, userLon, angle, radius);
            sectorPoints.push([endPoint.lat, endPoint.lon]);
        }
        sectorPoints.push([userLat, userLon]);

        if (deviceOrientationFan) map.removeLayer(deviceOrientationFan);
        deviceOrientationFan = L.polygon(sectorPoints, {
            color: 'gray',
            fillColor: 'gray',
            fillOpacity: 0.2,
            weight: 1
        }).addTo(map);
    }

    // Begin initialization
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;

                map.setView([userLat, userLon], 18);
                userMarker = L.marker([userLat, userLon])
                    .addTo(map)
                    .bindPopup('Deine Position')
                    .openPopup();

                initialLoadOfRiddles().then(() => {
                    startWatchingPosition();
                    const showTutorial = localStorage.getItem('showTutorial') === null || JSON.parse(localStorage.getItem('showTutorial')) === true;

                    if (riddles.length > 0) {
                        if (round === 1 && showTutorial) {
                            showInstructions();
                        } else {
                            startRound();
                        }
                    } else {
                        showMessage('Keine Rätsel an deinem aktuellen Standort verfügbar.', () => {
                            window.location.href = 'index.html';
                        });
                    }
                });
            },
            error => {
                console.error('Geolocation Fehler:', error);
                showMessage('Standortzugriff ist erforderlich, um zu spielen.', () => {
                    window.location.href = 'index.html';
                });
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 2000 }
        );
    } else {
        showMessage('Geolocation wird von deinem Browser nicht unterstützt.', () => {
            window.location.href = 'index.html';
        });
    }

    if (hintButton) {
        hintButton.addEventListener('click', () => hintMenu.classList.toggle('show'));
    }

    if (logLocationButton) {
        logLocationButton.addEventListener('click', () => {
            clearInterval(roundTimer);
            logPlayerLocation();
        });
    }

    if (textHintButton) textHintButton.addEventListener('click', handleTextHint);
    if (directionHintButton) directionHintButton.addEventListener('click', handleDirectionHint);
    if (radiusHintButton) radiusHintButton.addEventListener('click', handleRadiusHint);

    // Listen for device orientation to update fan direction
    window.addEventListener('deviceorientation', (event) => {
        const alpha = event.alpha; 
        if (alpha !== null && userMarker) {
            currentHeading = alpha * Math.PI / 180;
            updateDeviceOrientationFan();
        }
    });
});
