// scripts/main.js

document.addEventListener('DOMContentLoaded', function() {
    // Wetterdaten abrufen und Icon anzeigen
    getWeather();

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
});

// Funktion zur Aktualisierung der Punkte und gelösten Rätsel
function updateStats() {
    var points = parseInt(localStorage.getItem('points')) || 0;
    var solvedRiddles = JSON.parse(localStorage.getItem('solvedRiddles')) || [];

    document.getElementById('totalPoints').innerText = points;
    document.getElementById('solvedRiddlesCount').innerText = solvedRiddles.length;
}

// Funktion zum Abrufen des Wetters (mit Open-Meteo API)
function getWeather() {
    // Koordinaten der Stadt (z.B. Karlsruhe)
    var lat = 49.0069;
    var lon = 8.4037;

    var url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

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
    var weatherCode = weatherData.current_weather.weathercode;
    var temperature = weatherData.current_weather.temperature;

    // Mapping von Wettercodes zu Icons
    var weatherIconUrl = getWeatherIconUrl(weatherCode);

    var weatherIconDiv = document.getElementById('weatherIcon');
    var img = document.createElement('img');
    img.src = weatherIconUrl;
    img.alt = 'Wetter Icon';

    var tempText = document.createElement('span');
    tempText.innerText = ` ${temperature}°C`;

    // Leeren des Divs, falls bereits ein Icon vorhanden ist
    weatherIconDiv.innerHTML = '';
    weatherIconDiv.appendChild(img);
    weatherIconDiv.appendChild(tempText);
}

// Funktion zum Zuordnen der Wettercodes zu Icons
function getWeatherIconUrl(weatherCode) {
    // Sie können Ihre eigenen Icons verwenden oder auf kostenlose Icon-Sets verlinken
    // Hier verwenden wir Platzhalter-Icons aus einer öffentlichen Quelle

    var iconUrlBase = 'https://openweathermap.org/img/wn/';

    var iconMap = {
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

    var iconCode = iconMap[weatherCode] || '01d'; // Standard-Icon, wenn kein Code gefunden wird
    var iconUrl = `${iconUrlBase}${iconCode}@2x.png`;
    return iconUrl;
}
