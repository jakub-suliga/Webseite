// Scripts/maps.js

document.addEventListener('DOMContentLoaded', () => {
    let riddles = [];
    let solvedRiddles = JSON.parse(localStorage.getItem('solvedRiddles')) || [];
    let points = 0;
    let currentRiddle = null;
    let hintsUsed = { text: 0, direction: 0, radius: 0};
    let totalHintsUsed = JSON.parse(localStorage.getItem('totalHintsUsed')) || { text: 0, direction: 0, radius: 0 };
    const maxHints = 3;
    let userMarker = null;
    let directionLine = null;
    let radiusCircle = null;
    let hintsAvailable = [];
    let selectedCategories = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    let categoriesPlayedData = JSON.parse(localStorage.getItem('categoriesPlayedData')) || {};
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

    const gameTime = parseInt(localStorage.getItem('gameTime'), 10) || 5;
    const maxDistance = parseFloat(localStorage.getItem('maxDistance')) || 1;
    const maxRounds = parseInt(localStorage.getItem('numRounds'), 10) || 3;

    const roundDuration = gameTime * 60 * 1000;
    const cityBoundaries = {
        Karlsruhe: { latMin: 48.9, latMax: 49.1, lonMin: 8.3, lonMax: 8.6 },
        Stuttgart: { latMin: 48.72, latMax: 48.83, lonMin: 9.08, lonMax: 9.27 },
    };

    let deviceOrientationFan = null;
    let currentHeading = null;

    const map = L.map('map', { zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap-Mitwirkende',
    }).addTo(map);

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

    // Tutorial-Elemente (optional, falls vorhanden)
    const tutorialBox = document.querySelector('.tutorial-box');
    const tutorialContent = tutorialBox ? tutorialBox.querySelector('.tutorial-content') : null;
    const tutorialCloseButton = tutorialBox ? document.getElementById('tutorialCloseButton') : null;
    const tutorialCheckbox = tutorialBox ? document.getElementById('showTutorialCheckbox') : null;


    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                currentCity = getCurrentCity(userLat, userLon);

                if (currentCity) {
                    map.setView([userLat, userLon], 18);
                    userMarker = L.marker([userLat, userLon])
                        .addTo(map)
                        .bindPopup('Deine Position')
                        .openPopup();

                    loadRiddles();
                    startWatchingPosition();
                } else {
                    showMessage('Es gibt keine Rätsel für Ihren aktuellen Standort.', () => {
                        window.location.href = 'index.html';
                    });
                }
            },
            error => {
                console.error('Fehler bei der Standortbestimmung:', error);
                showMessage('Um dieses Spiel zu spielen, muss der Standortzugriff erlaubt sein.', () => {
                    window.location.href = 'index.html';
                });
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 2000 }
        );
    } else {
        showMessage('Geolocation wird von Ihrem Browser nicht unterstützt.', () => {
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

    // Geräteorientierung hinzufügen (falls verfügbar)
    window.addEventListener('deviceorientation', (event) => {
        const alpha = event.alpha; 
        if (alpha !== null && userMarker) {
            currentHeading = alpha * Math.PI / 180; // in Radianten
            updateDeviceOrientationFan();
        }
    });

    function getCurrentCity(lat, lon) {
        for (const city in cityBoundaries) {
            const bounds = cityBoundaries[city];
            if (lat >= bounds.latMin && lat <= bounds.latMax && lon >= bounds.lonMin && lon <= bounds.lonMax) {
                return city;
            }
        }
        return null;
    }

    function loadRiddles() {
        fetch('Data/riddles.json')
            .then(response => {
                if (!response.ok) throw new Error('Netzwerkantwort war nicht ok');
                return response.json();
            })
            .then(data => {
                riddles = data.riddles
                    .filter(r => r.city === currentCity)
                    .filter(r => selectedCategories.length > 0 ? selectedCategories.includes(r.category) : true)
                    .filter(r => !solvedRiddles.includes(r.id));

                if (userMarker) {
                    riddles = riddles.filter(r => {
                        const dist = getDistance(userMarker.getLatLng().lat, userMarker.getLatLng().lng, r.latitude, r.longitude) / 1000;
                        return dist <= maxDistance;
                    });
                }

                const showTutorial = localStorage.getItem('showTutorial') === null || JSON.parse(localStorage.getItem('showTutorial')) === true;

                if (riddles.length > 0) {
                    // Nur am Anfang des Spiels (runde 1) wird das Tutorial gezeigt
                    if (round === 1 && showTutorial) {
                        showInstructions();
                    } else {
                        startRound();
                    }
                } else {
                    showMessage(
                        'Es gibt keine verfügbaren Rätsel innerhalb der eingestellten Entfernung für Ihren Standort und die ausgewählten Kategorien.',
                        () => { window.location.href = 'index.html'; }
                    );
                }
            })
            .catch(error => {
                console.error('Fehler beim Laden der Rätsel:', error);
                if (currentRiddleElement) currentRiddleElement.innerText = 'Fehler beim Laden der Rätsel.';
            });
    }

    function showInstructions() {
        if (!tutorialBox || !tutorialContent || !tutorialCloseButton || !tutorialCheckbox) {
            startRound();
            return;
        }
        const instructions = `
        <h3>Willkommen zur Schatzsuche!</h3>
        <p>In diesem Spiel erhältst du Rätsel, die du lösen musst, indem du Orte in deiner Umgebung besuchst.</p>
        <p><strong>So funktioniert's:</strong></p>
        <ul>
            <li>Du erhältst ein Rätsel, das dich zu einem bestimmten Ort führt.</li>
            <li>Nutze die Hinweise, wenn du Hilfe brauchst. Jeder Hinweis kostet 100 Punkte.</li>
            <li>Je näher du am Ziel bist, desto mehr Punkte (bis zu 1000) erhältst du. Bei über 50m Entfernung sinken die Punkte linear.</li>
            <li>Wenn du glaubst, am richtigen Ort zu sein, klicke auf "Standort einloggen".</li>
            <li>Nach jeder Runde kannst du durch Klick auf "Weiter" zur nächsten Runde gelangen.</li>
        </ul>
        <p><strong>Hinweise im Detail:</strong></p>
        <ul>
            <li><strong>Text-Tipp:</strong> Zusätzliche schriftliche Hinweise.</li>
            <li><strong>Richtungs-Tipp:</strong> Zeigt einen sehr kurzen Sektor an, in dessen Richtung das Ziel liegt.</li>
            <li><strong>Radius-Tipp:</strong> Markiert einen Bereich (Kreis) auf der Karte, in dem sich das Ziel befindet.</li>
        </ul>
        <p>Viel Spaß bei der Schatzsuche!</p>
        `;
        tutorialContent.innerHTML = instructions;
        tutorialBox.style.display = 'flex';

        tutorialCloseButton.onclick = () => {
            tutorialBox.style.display = 'none';
            localStorage.setItem('showTutorial', !tutorialCheckbox.checked);
            startRound();
        };
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
        return riddles.splice(randomIndex, 1)[0]; 
    }

    function displayRiddle() {
        if (!currentRiddle || !currentRiddle.question) return;
        if (currentRiddleElement) currentRiddleElement.innerText = currentRiddle.question;
        if (currentHintElement) currentHintElement.innerText = '';
        if (riddleAnswerElement) riddleAnswerElement.style.display = 'none';
        if (answerTextElement) answerTextElement.innerText = '';

        hintsUsed = { text: 0, direction: 0, radius: 0};
        hintsAvailable = currentRiddle.hints ? [...currentRiddle.hints] : [];
        updatePointsDisplay();

        // Buttons wieder aktivieren
        enableHintButtons();

        if (currentRiddle.category) {
            categoriesPlayedData[currentRiddle.category] = (categoriesPlayedData[currentRiddle.category] || 0) + 1;
            localStorage.setItem('categoriesPlayedData', JSON.stringify(categoriesPlayedData));
        }

        if (logLocationButton) {
            logLocationButton.style.display = 'block';
        }
        if (continueButton) continueButton.style.display = 'none';
    }

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

    function updateTimerDisplay(time) {
        if (!timerElement) return;
        const minutes = Math.floor(time / 60000);
        const seconds = ((time % 60000) / 1000).toFixed(0);
        timerElement.innerText = `Zeit: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (time <= 60000) {
            timerElement.style.color = 'red';
            timerElement.style.fontSize = '24px';
        } else {
            timerElement.style.color = 'black';
            timerElement.style.fontSize = '18px';
        }
    }

    function timerEnded() {
        logPlayerLocation();
    }

    function logPlayerLocation() {
        // Prüfen, ob bereits eine bekannte Nutzerposition vorhanden ist
        if (!userMarker) {
            console.error('Keine bekannte Nutzerposition vorhanden. Kann Standort nicht einloggen.');
            showMessage('Standortbestimmung nicht möglich.', () => {});
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
    
        showSolution(userLat, userLon, treasureLat, treasureLon);
        if (logLocationButton) logLocationButton.style.display = 'none';
        if (continueButton) continueButton.style.display = 'block';
    
        if (roundPointsEl) {
            roundPointsEl.innerText = `Rundenpunkte: ${finalPoints}`;
        }
    
        // Nach Standort einloggen: Hint-Buttons deaktivieren
        disableAllHintButtons();
    
        // Wenn das Hint-Menü noch offen ist, schließe es
        if (hintMenu && hintMenu.classList.contains('show')) {
            hintMenu.classList.remove('show');
        }
    }
    

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

    function showSolution(userLat, userLon, treasureLat, treasureLon) {
        if (answerTextElement) answerTextElement.innerText = currentRiddle.answer;
        if (riddleAnswerElement) riddleAnswerElement.style.display = 'block'; // Antwort anzeigen

        if (logLocationButton) logLocationButton.style.display = 'none'; // Standort-Button ausblenden
        if (continueButton) continueButton.style.display = 'block'; // Weiter-Button anzeigen

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

            // Wenn das Hint-Menü noch offen ist, schließe es
            if (hintMenu && hintMenu.classList.contains('show')) {
                hintMenu.classList.remove('show');
            }

            navigator.geolocation.getCurrentPosition(position => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                if (userMarker) {
                    userMarker.setLatLng([userLat, userLon]);
                }

                loadRiddles();
                round++;
                startRound();
            }, showError, { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
        };
    }

    function endGame() {
        const avgDistance = (totalDistance / maxRounds).toFixed(2);
        const avgPointsPerRound = (points / maxRounds).toFixed(2);
        const message = `Spiel beendet! Du hast insgesamt ${points} Punkte erreicht.
Durchschnittliche Entfernung zum Ziel: ${avgDistance} km
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

    function resetGame() {
        round = 1;
        points = 0;
        totalDistance = 0;
        riddles = [];
        solvedRiddles = [];
        localStorage.setItem('solvedRiddles', JSON.stringify(solvedRiddles));

        clearMapHints();
        if (treasureMarker) { map.removeLayer(treasureMarker); treasureMarker = null; }
        if (solutionLine) { map.removeLayer(solutionLine); solutionLine = null; }
        if (solutionArrow) { map.removeLayer(solutionArrow); solutionArrow = null; }

        updatePointsDisplay();
        updateRoundUI();
        startWatchingPosition();
        loadRiddles();
    }

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

    function handleDirectionHint() {
        if (hintsUsed.direction >= maxHints) return;
        hintsUsed.direction++;
    
        // Statt erneut Geolocation abzurufen, verwenden wir die letzte bekannte Position aus userMarker
        if (!userMarker) {
            console.log('Keine Nutzerposition vorhanden.');
            return;
        }
    
        const userLat = userMarker.getLatLng().lat;
        const userLon = userMarker.getLatLng().lng;
    
        if (directionLine) map.removeLayer(directionLine);
    
        const bearing = getBearing(userLat, userLon, currentRiddle.latitude, currentRiddle.longitude);
    
        // Richtungs-Tipp nun 200 m lang
        const radius = 200;  
        // Basiswinkel zuvor 20°, jetzt verdoppeln wir auf 40°
        const baseAngleDegrees = 40;
        const decreasePerUse = 5;
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

        // Nach dem Platzieren des Kreises herauszoomen, um ihn sichtbar zu machen
        map.fitBounds(radiusCircle.getBounds());

        updatePointsDisplay();
        if (hintsUsed.radius >= maxHints) disableButton(radiusHintButton);
    }  

    function clearMapHints() {
        if (directionLine) { map.removeLayer(directionLine); directionLine = null; }
        if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
    }

    function showError(error) {
        console.error('Fehler bei der Standortbestimmung:', error);
    }

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

    function getBearing(lat1, lon1, lat2, lon2) {
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const λ1 = (lon1 * Math.PI) / 180;
        const λ2 = (lon2 * Math.PI) / 180;
        const y = Math.sin(λ2 - λ1)*Math.cos(φ2);
        const x = Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2 - λ1);
        return Math.atan2(y, x);
    }

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
        // Punkte nur im unteren Statistik-Bereich anzeigen
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

        modalButton1.innerText = 'Zur Startseite';
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
            showMessage('Geolocation wird von Ihrem Browser nicht unterstützt.', () => {
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

    function updateDeviceOrientationFan() {
        if (!userMarker || currentHeading === null) return;
        const userLat = userMarker.getLatLng().lat;
        const userLon = userMarker.getLatLng().lng;
    
        // Statt 15° pro Seite nun 20° pro Seite
        const angleRange = 20 * (Math.PI/180); 
        const startAngle = currentHeading - angleRange;
        const endAngle = currentHeading + angleRange;
    
        // Statt 20 m nun 50 m Reichweite des Fächers
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
});
