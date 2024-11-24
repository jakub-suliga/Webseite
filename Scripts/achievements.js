// scripts/achievements.js

document.addEventListener('DOMContentLoaded', function() {
    displayAchievements();
});

function displayAchievements() {
    const achievementsContainer = document.getElementById('achievementsContainer');

    // Achievements aus dem localStorage laden
    const achievements = JSON.parse(localStorage.getItem('achievements')) || [];

    if (achievements.length === 0) {
        achievementsContainer.innerHTML = '<p>Du hast noch keine Achievements gesammelt.</p>';
    } else {
        achievements.forEach(function(achievement) {
            const achievementElement = document.createElement('div');
            achievementElement.classList.add('achievement');
            achievementElement.innerText = achievement;
            achievementsContainer.appendChild(achievementElement);
        });
    }
}
