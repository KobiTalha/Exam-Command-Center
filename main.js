// StudyFlow - Main JavaScript File
// Handles timer functionality, animations, and app state management

class StudyTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentTime = 25 * 60; // 25 minutes in seconds
        this.sessionType = 'focus'; // 'focus' or 'break'
        this.sessionCount = 1;
        this.maxSessions = 8;
        this.interval = null;
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
    }

    initializeElements() {
        this.timerDisplay = document.getElementById('timer-display');
        this.timerLabel = document.getElementById('timer-label');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.sessionCountDisplay = document.getElementById('session-count');
        this.timerCircle = document.querySelector('.timer-circle');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            
            // Update button visibility
            this.startBtn.classList.add('hidden');
            this.pauseBtn.classList.remove('hidden');
            
            // Start the countdown
            this.interval = setInterval(() => {
                this.currentTime--;
                this.updateDisplay();
                this.updateProgress();
                
                if (this.currentTime <= 0) {
                    this.complete();
                }
            }, 1000);
            
            // Add visual feedback
            this.addTimerAnimation();
            this.showNotification('Focus session started! 🎯');
        }
    }

    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            this.isPaused = true;
            
            clearInterval(this.interval);
            
            // Update button visibility
            this.startBtn.classList.remove('hidden');
            this.pauseBtn.classList.add('hidden');
            this.startBtn.textContent = 'Resume';
            
            this.showNotification('Session paused');
        }
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        
        clearInterval(this.interval);
        
        // Reset time based on session type
        if (this.sessionType === 'focus') {
            this.currentTime = 25 * 60;
        } else {
            this.currentTime = 5 * 60;
        }
        
        // Update button visibility
        this.startBtn.classList.remove('hidden');
        this.pauseBtn.classList.add('hidden');
        this.startBtn.textContent = 'Start Focus';
        
        this.updateDisplay();
        this.updateProgress();
        
        // Remove animations
        this.removeTimerAnimation();
    }

    complete() {
        this.isRunning = false;
        clearInterval(this.interval);
        
        // Update button visibility
        this.startBtn.classList.remove('hidden');
        this.pauseBtn.classList.add('hidden');
        
        if (this.sessionType === 'focus') {
            // Focus session completed
            this.showNotification('Focus session completed! Time for a break 🎉');
            this.sessionCount++;
            this.sessionCountDisplay.textContent = this.sessionCount;
            
            // Switch to break session
            this.sessionType = 'break';
            this.currentTime = 5 * 60; // 5 minutes
            this.timerLabel.textContent = 'Break';
            this.startBtn.textContent = 'Start Break';
            
            // Update progress in localStorage
            this.updateStudyProgress();
            
        } else {
            // Break session completed
            this.showNotification('Break time over! Ready for another focus session? 💪');
            
            // Switch back to focus session
            this.sessionType = 'focus';
            this.currentTime = 25 * 60; // 25 minutes
            this.timerLabel.textContent = 'Focus';
            this.startBtn.textContent = 'Start Focus';
        }
        
        this.updateDisplay();
        this.updateProgress();
        this.removeTimerAnimation();
        
        // Play completion sound (if supported)
        this.playCompletionSound();
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.timerLabel.textContent = this.sessionType === 'focus' ? 'Focus' : 'Break';
    }

    updateProgress() {
        const totalTime = this.sessionType === 'focus' ? 25 * 60 : 5 * 60;
        const progress = ((totalTime - this.currentTime) / totalTime) * 360;
        this.timerCircle.style.setProperty('--progress', `${progress}deg`);
    }

    addTimerAnimation() {
        this.timerCircle.style.animation = 'pulse 2s ease-in-out infinite';
    }

    removeTimerAnimation() {
        this.timerCircle.style.animation = '';
    }

    playCompletionSound() {
        // Create a simple beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    updateStudyProgress() {
        // Update localStorage with study progress
        const today = new Date().toDateString();
        let studyData = JSON.parse(localStorage.getItem('studyData') || '{}');
        
        if (!studyData[today]) {
            studyData[today] = { sessions: 0, totalTime: 0 };
        }
        
        studyData[today].sessions += 1;
        studyData[today].totalTime += 25; // 25 minutes
        
        localStorage.setItem('studyData', JSON.stringify(studyData));
        localStorage.setItem('lastStudyDate', today);
    }

    showNotification(message) {
        // Create and show notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 transform -translate-y-full transition-transform duration-300';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-coral-100 rounded-full flex items-center justify-center">
                    <span class="text-coral-600 text-sm">⏰</span>
                </div>
                <div class="flex-1">
                    <div class="text-sm font-medium text-gray-800">StudyFlow</div>
                    <div class="text-xs text-gray-600">${message}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Subject Selection Handler
class SubjectManager {
    constructor() {
        this.selectedSubject = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.subjectCards = document.querySelectorAll('.subject-card');
    }

    bindEvents() {
        this.subjectCards.forEach(card => {
            card.addEventListener('click', () => this.selectSubject(card));
        });
    }

    selectSubject(card) {
        // Remove previous selection
        this.subjectCards.forEach(c => c.classList.remove('border-coral-500'));
        
        // Add selection to clicked card
        card.classList.add('border-coral-500');
        
        // Store selected subject
        this.selectedSubject = card.dataset.subject;
        
        // Add selection animation
        anime({
            targets: card,
            scale: [1, 1.05, 1],
            duration: 300,
            easing: 'easeOutElastic(1, .8)'
        });
        
        // Show notification
        this.showSubjectNotification(card.dataset.subject);
    }

    showSubjectNotification(subject) {
        const subjectNames = {
            math: 'Mathematics',
            science: 'Science',
            literature: 'Literature',
            history: 'History'
        };
        
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg p-3 z-40 transform translate-y-full transition-transform duration-300';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-6 h-6 bg-coral-100 rounded-full flex items-center justify-center">
                    <span class="text-coral-600 text-xs">📚</span>
                </div>
                <div class="flex-1">
                    <div class="text-sm font-medium text-gray-800">${subjectNames[subject]} selected</div>
                    <div class="text-xs text-gray-600">Ready to start studying!</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // Remove after 2 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }
}

// Achievement System
class AchievementManager {
    constructor() {
        this.achievements = this.loadAchievements();
        this.checkAchievements();
    }

    loadAchievements() {
        return JSON.parse(localStorage.getItem('achievements') || '[]');
    }

    saveAchievements() {
        localStorage.setItem('achievements', JSON.stringify(this.achievements));
    }

    unlockAchievement(achievementId) {
        if (!this.achievements.includes(achievementId)) {
            this.achievements.push(achievementId);
            this.saveAchievements();
            this.showAchievementNotification(achievementId);
        }
    }

    showAchievementNotification(achievementId) {
        const achievements = {
            'first-session': { name: 'First Focus Session', icon: '🏆' },
            'week-warrior': { name: 'Week Warrior', icon: '🔥' },
            'bookworm': { name: 'Bookworm', icon: '📚' },
            'time-master': { name: 'Time Master', icon: '⏰' }
        };
        
        const achievement = achievements[achievementId];
        if (!achievement) return;
        
        const notification = document.createElement('div');
        notification.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        notification.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-8 text-center max-w-sm mx-4 transform scale-0 transition-transform duration-300">
                <div class="text-6xl mb-4">${achievement.icon}</div>
                <div class="text-xl font-bold text-gray-800 mb-2">Achievement Unlocked!</div>
                <div class="text-lg font-semibold text-coral-500 mb-2">${achievement.name}</div>
                <div class="text-sm text-gray-600">Keep up the great work!</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.querySelector('div').style.transform = 'scale(1)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.querySelector('div').style.transform = 'scale(0)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    checkAchievements() {
        const studyData = JSON.parse(localStorage.getItem('studyData') || '{}');
        const today = new Date().toDateString();
        
        // Check for first session
        if (studyData[today] && studyData[today].sessions >= 1) {
            this.unlockAchievement('first-session');
        }
        
        // Check for week warrior (7 consecutive days)
        const streak = this.calculateStreak();
        if (streak >= 7) {
            this.unlockAchievement('week-warrior');
        }
    }

    calculateStreak() {
        const studyData = JSON.parse(localStorage.getItem('studyData') || '{}');
        const dates = Object.keys(studyData).sort((a, b) => new Date(b) - new Date(a));
        
        let streak = 0;
        let currentDate = new Date();
        
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            const dayDiff = Math.floor((currentDate - date) / (1000 * 60 * 60 * 24));
            
            if (dayDiff === streak) {
                streak++;
                currentDate = date;
            } else {
                break;
            }
        }
        
        return streak;
    }
}

// Animation Manager
class AnimationManager {
    constructor() {
        this.initializeAnimations();
    }

    initializeAnimations() {
        // Animate subject cards on load
        anime({
            targets: '.subject-card',
            translateY: [50, 0],
            opacity: [0, 1],
            delay: anime.stagger(100),
            duration: 600,
            easing: 'easeOutExpo'
        });

        // Animate progress bars
        anime({
            targets: '.progress-ring',
            rotate: [0, 360],
            duration: 2000,
            easing: 'easeInOutSine',
            loop: true
        });

        // Floating particles animation
        this.animateParticles();
    }

    animateParticles() {
        const particles = document.querySelectorAll('.particle');
        particles.forEach((particle, index) => {
            anime({
                targets: particle,
                translateY: [-20, 20],
                translateX: [Math.random() * 20 - 10, Math.random() * 20 - 10],
                scale: [0.8, 1.2, 0.8],
                opacity: [0.3, 0.8, 0.3],
                duration: 4000 + (index * 500),
                easing: 'easeInOutSine',
                loop: true
            });
        });
    }

    addButtonClickAnimation(button) {
        anime({
            targets: button,
            scale: [1, 0.95, 1],
            duration: 150,
            easing: 'easeOutQuad'
        });
    }
}

// Study Statistics
class StudyStatistics {
    constructor() {
        this.initializeStats();
        this.updateStats();
    }

    initializeStats() {
        // Initialize study data if not exists
        if (!localStorage.getItem('studyData')) {
            localStorage.setItem('studyData', JSON.stringify({}));
        }
    }

    updateStats() {
        const studyData = JSON.parse(localStorage.getItem('studyData') || '{}');
        const today = new Date().toDateString();
        
        // Update today's stats
        if (studyData[today]) {
            const todayData = studyData[today];
            
            // Update focus sessions display
            const sessionsElement = document.querySelector('.text-sm.font-semibold.text-gray-800');
            if (sessionsElement && sessionsElement.textContent.includes('/')) {
                sessionsElement.textContent = `${todayData.sessions}/8`;
            }
            
            // Update progress bar
            const progressBar = document.querySelector('.bg-gradient-to-r.from-coral-400.to-coral-500');
            if (progressBar) {
                const percentage = (todayData.sessions / 8) * 100;
                progressBar.style.width = `${percentage}%`;
            }
        }
        
        // Update weekly stats
        this.updateWeeklyStats();
    }

    updateWeeklyStats() {
        const studyData = JSON.parse(localStorage.getItem('studyData') || '{}');
        let weeklyHours = 0;
        let totalSessions = 0;
        
        Object.values(studyData).forEach(dayData => {
            weeklyHours += (dayData.totalTime || 0) / 60; // Convert minutes to hours
            totalSessions += dayData.sessions || 0;
        });
        
        // Update weekly hours display
        const weeklyElement = document.querySelector('.text-lg.font-bold.text-gray-800');
        if (weeklyElement && weeklyElement.nextElementSibling.textContent === 'This Week') {
            weeklyElement.textContent = `${Math.round(weeklyHours)}h`;
        }
    }
}

// Navigation Manager
class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.updateNavigation();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('planner')) return 'planner';
        if (path.includes('progress')) return 'progress';
        if (path.includes('resources')) return 'resources';
        return 'dashboard';
    }

    updateNavigation() {
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (
                (this.currentPage === 'dashboard' && href === 'index.html') ||
                (this.currentPage === 'planner' && href === 'planner.html') ||
                (this.currentPage === 'progress' && href === 'progress.html') ||
                (this.currentPage === 'resources' && href === 'resources.html')
            ) {
                link.classList.remove('text-gray-400');
                link.classList.add('text-coral-500');
            } else {
                link.classList.remove('text-coral-500');
                link.classList.add('text-gray-400');
            }
        });
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all managers
    const timer = new StudyTimer();
    const subjectManager = new SubjectManager();
    const achievementManager = new AchievementManager();
    const animationManager = new AnimationManager();
    const statistics = new StudyStatistics();
    const navigation = new NavigationManager();
    
    // Add global button click animations
    document.addEventListener('click', function(e) {
        if (e.target.matches('button, .subject-card, .calendar-day')) {
            animationManager.addButtonClickAnimation(e.target);
        }
    });
    
    // Add touch feedback for mobile
    document.addEventListener('touchstart', function(e) {
        if (e.target.matches('button, .subject-card, .calendar-day')) {
            e.target.style.transform = 'scale(0.98)';
        }
    });
    
    document.addEventListener('touchend', function(e) {
        if (e.target.matches('button, .subject-card, .calendar-day')) {
            e.target.style.transform = 'scale(1)';
        }
    });
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Update statistics every minute
    setInterval(() => {
        statistics.updateStats();
    }, 60000);
    
    console.log('StudyFlow app initialized successfully!');
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StudyTimer, SubjectManager, AchievementManager };
}