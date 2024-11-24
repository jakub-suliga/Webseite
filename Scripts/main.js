// scripts/main.js

document.addEventListener('DOMContentLoaded', function() {
    // Wetterdaten abrufen und Icon anzeigen
    getWeather();

    // Anzeige der Punkte und gelösten Rätsel
    updateStats();

    // Start-Button
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', function() {
        // Ausgewählte Kategorien speichern
        const selectedCategories = [];
        const checkboxes = document.querySelectorAll('input[name="category"]:checked');
        checkboxes.forEach(function(checkbox) {
            if (checkbox.value !== 'Alle') {
                selectedCategories.push(checkbox.value);
            }
        });
        localStorage.setItem('selectedCategories', JSON.stringify(selectedCategories));

        window.location.href = 'karte.html';
    });
});

// Funktion zur Aktualisierung der Punkte und gelösten Rätsel
function updateStats() {
    const points = parseInt(localStorage.getItem('points')) || 0;
    const solvedRiddles = JSON.parse(localStorage.getItem('solvedRiddles')) || [];

    document.getElementById('totalPoints').innerText = points;
    document.getElementById('solvedRiddlesCount').innerText = solvedRiddles.length;
}

// Funktion zum Abrufen des Wetters (mit Open-Meteo API)
function getWeather() {
    // Koordinaten der Stadt (z.B. Karlsruhe)
    const lat = 49.0069;
    const lon = 8.4037;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    fetch(url)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Netzwerkantwort war nicht ok');
            }
            return response.json();
        })
        .then(function(data) {
            displayWeatherIcon(data);
        })
        .catch(function(error) {
            console.error('Fehler beim Abrufen der Wetterdaten:', error);
        });
}

// Funktion zum Anzeigen des Wetter-Icons
function displayWeatherIcon(weatherData) {
    const weatherCode = weatherData.current_weather.weathercode;
    const temperature = weatherData.current_weather.temperature;

    // Mapping von Wettercodes zu Icons
    const weatherIconUrl = getWeatherIconUrl(weatherCode);

    const weatherIconDiv = document.getElementById('weatherIcon');
    const img = document.createElement('img');
    img.src = weatherIconUrl;
    img.alt = 'Wetter Icon';

    const tempText = document.createElement('span');
    tempText.innerText = `${temperature}°C`;

    weatherIconDiv.appendChild(img);
    weatherIconDiv.appendChild(tempText);
}

// Funktion zum Zuordnen der Wettercodes zu Icons
function getWeatherIconUrl(weatherCode) {
    // Sie können Ihre eigenen Icons verwenden oder auf kostenlose Icon-Sets verlinken
    // Hier verwenden wir Platzhalter-Icons aus einer öffentlichen Quelle

    const iconUrlBase = 'https://openweathermap.org/img/wn/';

    const iconMap = {
        0: '01d',   // Klarer Himmel
        1: '02d',   // Überwiegend klar
        2: '03d',   // Teilweise bewölkt
        3: '04d',   // Bewölkt
        45: '50d',  // Nebel
        48: '50d',  // Ablagernder Nebel
        51: '09d',  // Leichter Nieselregen
        53: '09d',  // Mäßiger Nieselregen
        55: '09d',  // Starker Nieselregen
        56: '13d',  // Leichter gefrierender Nieselregen
        57: '13d',  // Starker gefrierender Nieselregen
        61: '10d',  // Leichter Regen
        63: '10d',  // Mäßiger Regen
        65: '10d',  // Starker Regen
        66: '13d',  // Leichter gefrierender Regen
        67: '13d',  // Starker gefrierender Regen
        71: '13d',  // Leichter Schneefall
        73: '13d',  // Mäßiger Schneefall
        75: '13d',  // Starker Schneefall
        77: '13d',  // Schneekörner
        80: '09d',  // Leichte Regenschauer
        81: '09d',  // Mäßige Regenschauer
        82: '09d',  // Heftige Regenschauer
        85: '13d',  // Leichte Schneeschauer
        86: '13d',  // Starke Schneeschauer
        95: '11d',  // Gewitter leicht oder mäßig
        96: '11d',  // Gewitter mit leichtem Hagel
        99: '11d'   // Gewitter mit starkem Hagel
    };

    const iconCode = iconMap[weatherCode] || '01d'; // Standard-Icon, wenn kein Code gefunden wird
    return `${iconUrlBase}${iconCode}@2x.png`;
}
