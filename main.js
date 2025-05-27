// Determine if we're running locally or in production
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BACKEND_URL = isLocalhost ? "http://localhost:3000" : "https://cs180-lyf180-project.onrender.com";

// Logout function
function logout() {
    // Clear login state
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

function on() {
    const overlay = document.getElementById("add-goal-overlay");
    overlay.style.display = "block";
    overlay.addEventListener("click", handleOverlayClick);
}

function off() {
    const overlay = document.getElementById("add-goal-overlay");
    overlay.style.display = "none";
    overlay.removeEventListener("click", handleOverlayClick);
}

// function initStats(stats = {}) {
//     return {
//         goalsCompleted: typeof stats.goalsCompleted === 'number' ? stats.goalsCompleted : 0,
//         habitsCompleted: typeof stats.habitsCompleted === 'number' ? stats.habitsCompleted : 0,
//         streak: typeof stats.streak === 'number' ? stats.streak : 0,
//         progressPercent: typeof stats.progressPercent === 'number' ? stats.progressPercent : 0,
//         totalGoals: typeof stats.totalGoals === 'number' ? stats.totalGoals : 0,
//         totalHabits: typeof stats.totalHabits === 'number' ? stats.totalHabits : 0,
//     };
// }

// Get current user data
function getCurrentUser() {
    try {
        const cachedUser = localStorage.getItem('currentUser');
        if (cachedUser) {
            return JSON.parse(cachedUser);
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Fetch user data from server
async function fetchUserData() {
    try {
        const username = localStorage.getItem('username');
        if (!username) return null;

        const response = await fetch(`${BACKEND_URL}/api/users/${username}`);
        if (!response.ok) throw new Error('Failed to fetch user data');
        const userData = await response.json();
        
        // Cache the user data
        localStorage.setItem('currentUser', JSON.stringify(userData));
        return userData;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

// Save current user data
async function saveCurrentUser(userData) {
    try {
        const username = localStorage.getItem('username');
        if (!username) return;

        // Only send updatable fields
        // EXCLUDE reflections to prevent overwriting journal entries
        const updatableFields = {
            goals: userData.goals,
            habits: userData.habits,
            stats: userData.stats,
            moods: userData.moods,
            reminders: userData.reminders,
            suggestions: userData.suggestions,
            unlockedBadges: userData.unlockedBadges,
        };

        const response = await fetch(`${BACKEND_URL}/api/users/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatableFields)
        });
        if (!response.ok) throw new Error('Failed to save user data');
        
        // Fetch the latest user data from the server and update the cache
        const updatedResponse = await fetch(`${BACKEND_URL}/api/users/${username}`);
        if (updatedResponse.ok) {
            const updatedUser = await updatedResponse.json();
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

async function fetchQuotes() {
    try {
        const response = await fetch('quotes.csv');
        const text = await response.text();
        const quotes = parseQuotesCSV(text);
        return quotes;
    } catch (error) {
        console.error('Error fetching quotes:', error);
        return [];
    }
}

// Function to parse CSV text into an array of quotes
function parseQuotesCSV(csvText) {
    const lines = csvText.split('\n').slice(1); // Skip header
    const quotes = lines.map(line => {
        const [author, text] = line.split('","').map(s => s.replace(/"/g, ''));
        return { author, text };
    }).filter(quote => quote.author && quote.text); // Filter out invalid quotes
    return quotes;
}

// Function to get a random quote
function getRandomQuote(quotes) {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
}

// Fetch and display a random quote
async function displayRandomQuote() {
    const quotes = await fetchQuotes();
    if (quotes.length > 0) {
        const randomQuote = getRandomQuote(quotes);
        const quoteElement = document.getElementById('test-quote');
        if (quoteElement) {
            quoteElement.textContent = `"${randomQuote.text}" -- ${randomQuote.author}`;
        }
    }
}

// Load user data
async function loadUserData() {
    try {
        const username = localStorage.getItem('username');
        if (!username) {
            console.error('No username found in localStorage');
            return;
        }

        const user = await fetchUserData();
        if (!user) {
            console.error('Failed to fetch user data');
            return;
        }
        
        // Initialize goals
        if (!user.goals) {
            user.goals = [];
        }
        updateGoalsDisplay();

        // Initialize habits
        if (!user.habits) {
            user.habits = [];
        }
        updateHabitsDisplay();

        // Initialize stats with default values
        if (!user.stats) {
            user.stats = {
                goalsCompleted: 0,
                habitsCompleted: 0,
                streak: 0,
                progressPercent: 0,
                totalHabits: user.habits.length,
                totalGoals: user.goals.length
            };
        } else {
            // Ensure all stats properties exist and are numbers
            user.stats.goalsCompleted = Number(user.stats.goalsCompleted) || 0;
            user.stats.habitsCompleted = Number(user.stats.habitsCompleted) || 0;
            user.stats.streak = Number(user.stats.streak) || 0;
            user.stats.progressPercent = Number(user.stats.progressPercent) || 0;
            // Set totalHabits and totalGoals based on actual arrays length
            user.stats.totalHabits = user.habits.length;
            user.stats.totalGoals = user.goals.length;
        }

        // Save the corrected stats
        await saveCurrentUser(user);
        updateProgress(user.stats);
        updateStatsDisplay(user.stats);

        // Initialize moods
        if (!user.moods || user.moods.length === 0) {
            user.moods = [{
                date: new Date().toISOString().split('T')[0],
                mood: 'Okay',
                completedGoals: 0,
                completedHabits: 0
            }];
            await saveCurrentUser(user);
        }
        updateMoodDisplay();

        // Initialize suggestions
        if (!user.suggestions || user.suggestions.length === 0) {
            user.suggestions = ["Set a new goal or habit to get started!"];
            await saveCurrentUser(user);
        }
        updateSuggestionsDisplay();

        // Initialize unlocked badges
        if (!user.unlockedBadges) {
            user.unlockedBadges = [];
            await saveCurrentUser(user);
        }

        // Render badges
        renderBadges();

        // Fetch and display quote
        await displayRandomQuote();

        // Initialize reminders
        if (user.reminders) {
            user.reminders.forEach(reminder => {
                if (reminder.active) {
                    setReminder(reminder.goalId, reminder.time);
                }
            });
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    const statsDiv = document.getElementById("stats");
    if (!statsDiv) return;

    // Ensure stats values are numbers
    stats.totalHabits = Number(stats.totalHabits) || 0;
    stats.totalGoals = Number(stats.totalGoals) || 0;
    stats.goalsCompleted = Number(stats.goalsCompleted) || 0;
    stats.habitsCompleted = Number(stats.habitsCompleted) || 0;
    stats.streak = Number(stats.streak) || 0;
    stats.progressPercent = Number(stats.progressPercent) || 0;

    let progressionBar;
    if (stats.totalHabits === 0 && stats.totalGoals === 0) {
        progressionBar = `<div class="nothing-done">No habits/goals set yet</div>`;
    } else {
        progressionBar = `<div class = "progress-bar">
        <div class = "fill-bar" style = "width: ${stats.progressPercent}%"></div>
        </div>`;
    }

    statsDiv.innerHTML = `
        <div class="stats-container">
            <h6 class="stats-title">Your Stats</h6>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-value">${stats.goalsCompleted}</div>
                    <div class="stat-label">Goals Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${stats.habitsCompleted}</div>
                    <div class="stat-label">Habits Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔥</div>
                    <div class="stat-value">${stats.streak}</div>
                    <div class="stat-label">Day Streak</div>
                </div>
            </div>
            ${progressionBar}
        </div>
    `;

    // Add styles if they don't exist
    if (!document.getElementById('stats-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'stats-styles';
        styleSheet.textContent = `
            .stats-container {
                background: #014240;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .stats-title {
                color: #ffffff;
                font-size: 1.2em;
                margin-bottom: 15px;
                text-align: center;
                font-weight: 600;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-top: 10px;
            }

            .stat-card {
                background: rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                transition: transform 0.2s ease;
                backdrop-filter: blur(5px);
            }

            .stat-card:hover {
                transform: translateY(-2px);
                background: rgba(255, 255, 255, 0.15);
            }

            .stat-icon {
                font-size: 1.8em;
                margin-bottom: 8px;
            }

            .stat-value {
                font-size: 1.5em;
                font-weight: bold;
                color: #ffffff;
                margin: 5px 0;
            }

            .stat-label {
                font-size: 0.9em;
                color: rgba(255, 255, 255, 0.9);
                margin-top: 5px;
            }

            .nothing-done {
                color: rgba(255, 255, 255, 0.7);
                text-align: center;
                padding: 15px;
                font-size: 1.1em;
                margin-top: 15px;
                background: rgba(255, 255, 255, 0.08);
                border-radius: 8px;
            }

            @media (max-width: 600px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                    gap: 10px;
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }
}

// Create completion popup
function createCompletionPopup() {
    const popup = document.createElement('div');
    popup.className = 'completion-popup';
    popup.innerHTML = `
        <p id="completion-message"></p>
        <div class="expiration-bar">
            <div class="expiration-progress"></div>
        </div>
        <button class="revert-button">Revert</button>
    `;
    document.body.appendChild(popup);
    return popup;
}

// Show completion popup
function showCompletionPopup(itemText, type, itemElement) {
    const popup = document.querySelector('.completion-popup') || createCompletionPopup();
    const message = popup.querySelector('#completion-message');
    const progressBar = popup.querySelector('.expiration-progress');
    const revertButton = popup.querySelector('.revert-button');
    
    // Set message
    message.textContent = `${type} completed: ${itemText}`;
    
    // Reset progress bar animation
    progressBar.style.animation = 'none';
    progressBar.offsetHeight; // Force reflow
    progressBar.style.animation = 'countdown 5s linear forwards';
    
    // Show popup with animation
    popup.classList.add('show');
    
    // Handle revert button
    const revertHandler = () => {
        // Restore the item
        const user = getCurrentUser();
        if (type === 'Goal') {
            user.goals.push({ text: itemText, completed: false });
            user.stats.goalsCompleted--;
            // Add the goal back to the list
            const goalList = document.getElementById("goal-list");
            const goalItem = document.createElement("li");
            const textSpan = document.createElement("span");
            textSpan.textContent = itemText;
            goalItem.appendChild(textSpan);
            addGoalClickHandler(goalItem);
            goalList.appendChild(goalItem);
        } else {
            user.habits.push({ text: itemText, completed: false });
            user.stats.habitsCompleted--;
            // Add the habit back to the list
            const habitList = document.getElementById("habits-list");
            const habitItem = document.createElement("li");
            const textSpan = document.createElement("span");
            textSpan.textContent = itemText;
            habitItem.appendChild(textSpan);
            addHabitClickHandler(habitItem);
            habitList.appendChild(habitItem);
        }
        updateProgress(user.stats);
        saveCurrentUser(user);
        updateStatsDisplay(user.stats);
        
        // Hide popup with animation
        popup.classList.remove('show');
        
        // Remove event listener
        revertButton.removeEventListener('click', revertHandler);
    };
    
    revertButton.addEventListener('click', revertHandler);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (popup.classList.contains('show')) {
            popup.classList.remove('show');
            revertButton.removeEventListener('click', revertHandler);
        }
    }, 5000);
}

// Add click handler for goals
function addGoalClickHandler(goalItem) {
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '&#10005;';
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        goalItem.style.opacity = '0';
        goalItem.style.transform = 'translateX(20px)';
        
        const user = getCurrentUser();
        const goalText = goalItem.querySelector('span').textContent;
        user.goals = user.goals.filter(g => g.text !== goalText);
        user.stats.totalGoals--;
        updateProgress(user.stats);
        updateStatsDisplay(user.stats);
        saveCurrentUser(user);
        
        setTimeout(() => {
            goalItem.parentNode.removeChild(goalItem);
        }, 300);
    });
    goalItem.appendChild(deleteBtn);

    // Add completion handler
    goalItem.addEventListener('click', function() {
        const goalText = this.querySelector('span').textContent;
        
        // Add a fade-out animation
        this.style.opacity = '0';
        this.style.transform = 'translateX(20px)';
        
        // Update user data
        const user = getCurrentUser();
        user.goals = user.goals.filter(g => g.text !== goalText);
        user.stats.goalsCompleted++;
        updateProgress(user.stats);
        saveCurrentUser(user);
        
        // Update stats display
        updateStatsDisplay(user.stats);
        
        // Show completion popup
        showCompletionPopup(goalText, 'Goal', this);
        
        // Remove the element after animation
        setTimeout(() => {
            this.parentNode.removeChild(this);
        }, 300);
    });
}

// Add click handler for habits
function addHabitClickHandler(habitItem) {
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '&#10005;';
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        habitItem.style.opacity = '0';
        habitItem.style.transform = 'translateX(20px)';
        
        const user = getCurrentUser();
        const habitText = habitItem.querySelector('span').textContent;
        user.habits = user.habits.filter(h => h.text !== habitText);
        user.stats.totalHabits--;
        updateProgress(user.stats);
        updateStatsDisplay(user.stats);
        saveCurrentUser(user);
        
        setTimeout(() => {
            habitItem.parentNode.removeChild(habitItem);
        }, 300);
    });
    habitItem.appendChild(deleteBtn);

    // Add completion handler
    habitItem.addEventListener('click', function() {
        const habitText = this.querySelector('span').textContent;
        
        // Add a fade-out animation
        this.style.opacity = '0';
        this.style.transform = 'translateX(20px)';
        
        // Update user data
        const user = getCurrentUser();
        user.habits = user.habits.filter(h => h.text !== habitText);
        user.stats.habitsCompleted++;
        updateProgress(user.stats);
        saveCurrentUser(user);
        
        // Update stats display
        updateStatsDisplay(user.stats);
        
        // Show completion popup
        showCompletionPopup(habitText, 'Habit', this);
        
        // Remove the element after animation
        setTimeout(() => {
            this.parentNode.removeChild(this);
        }, 300);
    });
}

function showError(formId, message) {
    const form = document.getElementById(formId);
    // Remove any existing error message
    const existingError = form.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create and add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Insert error message after the input field
    const input = form.querySelector('input');
    input.parentNode.insertBefore(errorDiv, input.nextSibling);
    
    // Remove error message after 3 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 3000);
}

function addGoal() {
    const goalInput = document.getElementById("goal-input").value;
    if (!goalInput.trim()) {
        showError('add-goal-form', 'Please enter a goal before submitting');
        return;
    }
    
    const goalList = document.getElementById("goal-list");
    const goalItem = document.createElement("li");
    const textSpan = document.createElement("span");
    textSpan.textContent = goalInput;
    goalItem.appendChild(textSpan);
    addGoalClickHandler(goalItem);
    goalList.appendChild(goalItem);

    // Save to user data
    const user = getCurrentUser();
    if (!user.goals) {
        user.goals = [];
    }
    user.goals.push({ text: goalInput, completed: false });
    
    // Update stats
    if (!user.stats) {
        user.stats = {
            goalsCompleted: 0,
            habitsCompleted: 0,
            streak: 0,
            progressPercent: 0,
            totalHabits: user.habits ? user.habits.length : 0,
            totalGoals: 1
        };
    } else {
        user.stats.totalGoals = user.goals.length;
    }
    
    updateProgress(user.stats);
    saveCurrentUser(user);
    updateStatsDisplay(user.stats);

    document.getElementById("goal-input").value = "";
    off(); // Only close the form if submission was successful
}

function addHabit() {
    const habitInput = document.getElementById("habit-input").value;
    if (!habitInput.trim()) {
        showError('add-habit-form', 'Please enter a habit before submitting');
        return;
    }
    
    const habitList = document.getElementById("habits-list");
    const habitItem = document.createElement("li");
    const textSpan = document.createElement("span");
    textSpan.textContent = habitInput;
    habitItem.appendChild(textSpan);
    addHabitClickHandler(habitItem);
    habitList.appendChild(habitItem);

    // Save to user data
    const user = getCurrentUser();
    if (!user.habits) {
        user.habits = [];
    }
    user.habits.push({ text: habitInput, completed: false });
    
    // Update stats
    if (!user.stats) {
        user.stats = {
            goalsCompleted: 0,
            habitsCompleted: 0,
            streak: 0,
            progressPercent: 0,
            totalHabits: 1,
            totalGoals: user.goals ? user.goals.length : 0
        };
    } else {
        user.stats.totalHabits = user.habits.length;
    }
    
    updateProgress(user.stats);
    saveCurrentUser(user);
    updateStatsDisplay(user.stats);

    document.getElementById("habit-input").value = "";
    offHabit(); // Only close the form if submission was successful
}

function clearGoals() {
    const goalList = document.getElementById("goal-list");
    goalList.innerHTML = "";
    
    // Clear goals in user data
    const user = getCurrentUser();
    user.stats.totalGoals -= user.goals.length;
    user.goals = [];
    updateProgress(user.stats);
    updateStatsDisplay(user.stats);
    saveCurrentUser(user);
}

function clearHabits() {
    const habitList = document.getElementById("habits-list");
    habitList.innerHTML = "";
    
    // Clear habits in user data
    const user = getCurrentUser();
    user.stats.totalHabits -= user.habits.length;
    user.habits = [];
    updateProgress(user.stats);
    updateStatsDisplay(user.stats);
    saveCurrentUser(user);
}

function handleOverlayClick(event) {
    const overlay = document.getElementById("add-goal-overlay");
    const form = document.getElementById("add-goal-form");
    
    if (event.target === overlay) {
        off();
    }
}

function onHabit() {
    const overlay = document.getElementById("add-habit-overlay");
    overlay.style.display = "block";
    overlay.addEventListener("click", handleHabitOverlayClick);
}

function offHabit() {
    const overlay = document.getElementById("add-habit-overlay");
    overlay.style.display = "none";
    overlay.removeEventListener("click", handleHabitOverlayClick);
}

function handleHabitOverlayClick(event) {
    const overlay = document.getElementById("add-habit-overlay");
    const form = document.getElementById("add-habit-form");
    
    if (event.target === overlay) {
        offHabit();
    }
}

// Add mood tracking
async function addMood(mood, journalEntry) {
    try {
        const user = getCurrentUser();
        if (!user) {
            console.error('No user data available');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Initialize moods array if it doesn't exist
        if (!user.moods) {
            user.moods = [];
        }

        // Overwrite today's mood if it exists
        const existingMoodIndex = user.moods.findIndex(m => m.date === today);
        if (existingMoodIndex !== -1) {
            user.moods[existingMoodIndex].mood = mood;
        } else {
            user.moods.push({
                date: today,
                mood: mood,
                completedGoals: user.goals ? user.goals.filter(g => g.completed).length : 0,
                completedHabits: user.habits ? user.habits.filter(h => h.completed).length : 0
            });
        }

        // Save the updated user data
        await saveCurrentUser(user);
        
        // Update the display
        updateMoodDisplay();
        
        // Generate suggestions based on the journal entry and mood
        if (journalEntry && journalEntry.trim()) {
            await generateSuggestionsFromJournal(journalEntry);
        } else {
            await generateSuggestions();
        }
        updateSuggestionsDisplay();
    } catch (error) {
        console.error('Error adding mood:', error);
    }
}

// Function to show the mood selector and journal entry
function showMoodSelector(event) {
    // Remove any existing mood selector
    const existingSelector = document.querySelector('.mood-selector');
    if (existingSelector) existingSelector.remove();

    // Create mood selector
    const moodSelector = document.createElement('div');
    moodSelector.className = 'mood-selector';
    moodSelector.innerHTML = `
        <div class="mood-options">
            <button onclick="selectMood('Great', this)" class="mood-option">😊 Great</button>
            <button onclick="selectMood('Good', this)" class="mood-option">🙂 Good</button>
            <button onclick="selectMood('Okay', this)" class="mood-option">😐 Okay</button>
            <button onclick="selectMood('Bad', this)" class="mood-option">😔 Bad</button>
            <button onclick="selectMood('Terrible', this)" class="mood-option">😢 Terrible</button>
        </div>
        <textarea id="journal-entry" placeholder="Write your journal entry here..."></textarea>
        <button id="submit-mood" onclick="submitMoodAndJournal(), closeMoodSelector()">Submit</button>
    `;

    // Position the selector
    const rect = event.target.getBoundingClientRect();
    moodSelector.style.position = 'absolute';
    moodSelector.style.left = rect.left + window.scrollX + 'px';
    moodSelector.style.top = rect.bottom + window.scrollY + 8 + 'px';
    moodSelector.style.zIndex = 2000;
    document.body.appendChild(moodSelector);

    // Add click outside handler to close the selector
    setTimeout(() => {
        document.addEventListener('click', function closeMoodSelector(e) {
            if (!moodSelector.contains(e.target) && !e.target.matches('.change-mood-btn, .mood-btn')) {
                moodSelector.remove();
                document.removeEventListener('click', closeMoodSelector);
            }
        });
    }, 0);
}
function closeMoodSelector() {
    const moodSelector = document.querySelector('.mood-selector');
    if (moodSelector) moodSelector.remove();
}
// Global variable to store the selected mood
let selectedMood = '';

// Function to select mood
function selectMood(mood, button) {
    selectedMood = mood; // Store the selected mood
    console.log(`Selected mood: ${selectedMood}`); // Debugging line

    // Remove 'selected' class from all buttons
    const moodButtons = document.querySelectorAll('.mood-option');
    moodButtons.forEach(btn => btn.classList.remove('selected'));

    // Add 'selected' class to the clicked button
    button.classList.add('selected');
}

// Function to submit mood and journal entry
async function submitMoodAndJournal() {
    const journalEntry = document.getElementById("journal-entry").value;
    const moodToSave = selectedMood; // Save the current mood before resetting
    console.log('Submitting mood and journal:', { selectedMood, journalEntry });
    
    if (!selectedMood) {
        alert('Please select a mood before submitting.');
        return;
    }
    if (!journalEntry.trim()) {
        console.error('No journal entry provided');
        alert('Please enter a journal entry before submitting.');
        return;
    }

    // Create new entry object
    const newEntry = {
        date: new Date().toISOString(),
        text: journalEntry,
        mood: selectedMood
    };

    // Get existing entries from localStorage or initialize empty array
    const username = localStorage.getItem('username');
    const localStorageKey = `${username}_journal_entries`;
    let entries = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
    
    // Add new entry to the beginning of the array
    entries.unshift(newEntry);
    // Sort entries by date descending (latest first)
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Save to localStorage
    localStorage.setItem(localStorageKey, JSON.stringify(entries));
    
    // Update display immediately
    const journalEntriesDiv = document.getElementById('journal-entries');
    if (journalEntriesDiv) {
        journalEntriesDiv.innerHTML = '';
        entries.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'journal-entry';
            entryElement.innerHTML = `
                <p><strong>${new Date(entry.date).toLocaleString()}</strong></p>
                <p>${entry.text}</p>
                <p>Mood: ${entry.mood}</p>
            `;
            journalEntriesDiv.appendChild(entryElement);
        });
    }
    
    // Also refresh the journal entries list to ensure the latest is shown
    loadJournalEntries();
    
    // Clear the form
    document.getElementById("journal-entry").value = '';
    selectedMood = ''; // Reset the selected mood
    updateMoodDisplay(); // Update the mood display

    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.textContent = 'Mood and journal entry saved successfully!';
    successMessage.style.position = 'fixed';
    successMessage.style.top = '20px';
    successMessage.style.left = '50%';
    successMessage.style.transform = 'translateX(-50%)';
    successMessage.style.backgroundColor = '#4CAF50';
    successMessage.style.color = 'white';
    successMessage.style.padding = '10px 20px';
    successMessage.style.borderRadius = '5px';
    successMessage.style.zIndex = '1000';
    document.body.appendChild(successMessage);

    // Remove success message after 3 seconds
    setTimeout(() => {
        successMessage.remove();
    }, 3000);

    // Save to MongoDB in the background
    try {
        // Save mood to MongoDB
        console.log('[DEBUG] Sending mood to:', `${BACKEND_URL}/api/users/${username}/mood`, 'Payload:', { mood: moodToSave });
        const moodRes = await fetch(`${BACKEND_URL}/api/users/${username}/mood`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mood: moodToSave })
        });
        const moodResBody = await moodRes.json().catch(() => ({}));
        console.log('[DEBUG] Mood response:', moodRes.status, moodResBody);

        // Save journal entry to MongoDB
        console.log('[DEBUG] Sending journal entry to:', `${BACKEND_URL}/api/users/${username}/journal`, 'Payload:', { journalEntry, mood: moodToSave });
        const journalRes = await fetch(`${BACKEND_URL}/api/users/${username}/journal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ journalEntry, mood: moodToSave })
        });
        const journalResBody = await journalRes.json().catch(() => ({}));
        console.log('[DEBUG] Journal response:', journalRes.status, journalResBody);
        
        // After successful MongoDB save, sync localStorage with the server response
        // This ensures localStorage matches exactly what's in MongoDB
        setTimeout(async () => {
            try {
                const syncResponse = await fetch(`${BACKEND_URL}/api/users/${username}/journal`);
                if (syncResponse.ok) {
                    const syncData = await syncResponse.json();
                    if (syncData.journalEntries) {
                        // Update localStorage with the exact data from MongoDB
                        syncData.journalEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
                        localStorage.setItem(localStorageKey, JSON.stringify(syncData.journalEntries));
                        // Update display with synced data
                        loadJournalEntries();
                    }
                }
            } catch (syncError) {
                console.error('[DEBUG] Error syncing with MongoDB:', syncError);
            }
        }, 1000); // Small delay to ensure MongoDB has processed the save
        
    } catch (error) {
        console.error('[DEBUG] Error saving to MongoDB:', error);
        // Don't show error to user since we've already saved locally
    }

    // Always generate suggestions after submitting a journal entry
    await generateSuggestionsFromJournal(journalEntry);
    updateSuggestionsDisplay();

    // After successful submission, reset selectedMood
    selectedMood = '';
}

function extractKeywords(journalEntry) {
    // Define a list of common stop words to ignore
    const stopWords = new Set([
        'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
        'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'could',
        'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
        'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'he', 'her',
        'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn\'t',
        'it', 'its', 'itself', 'just', 'll', 'm', 'ma', 'me', 'might', 'mightn\'t', 'more', 'most', 'must',
        'mustn\'t', 'my', 'myself', 'needn\'t', 'no', 'nor', 'not', 'now', 'o', 'of', 'off', 'on', 'once',
        'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 're', 's', 'same', 'she',
        'should', 'should\'ve', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs', 'them',
        'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
        'until', 'up', 've', 'very', 'was', 'wasn\'t', 'we', 'were', 'weren\'t', 'what', 'when', 'where',
        'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won\'t', 'would', 'wouldn\'t', 'you',
        'your', 'yours', 'yourself', 'yourselves'
    ]);

    // Split the journal entry into words, convert to lowercase, and filter out stop words
    const words = journalEntry
        .toLowerCase() // Convert to lowercase
        .match(/\b\w+\b/g) // Match words (alphanumeric)
        .filter(word => !stopWords.has(word)); // Filter out stop words

    // Get unique keywords
    const uniqueKeywords = [...new Set(words)];

    return uniqueKeywords;
}

// New function to generate suggestions based on journal entry
async function generateSuggestionsFromJournal(journalEntry) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/analyze-journal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                journalEntry,
                mood: selectedMood
            })
        });

        if (!response.ok) {
            throw new Error('Failed to analyze journal entry');
        }

        const data = await response.json();
        
        // Save suggestions to user data
        const user = getCurrentUser();
        user.suggestions = data.suggestions;
        await saveCurrentUser(user);
        
        // Update the suggestions display
        updateSuggestionsDisplay();
    } catch (error) {
        console.error('Error generating suggestions from journal:', error);
        // Fallback to basic suggestions if API call fails
        const user = getCurrentUser();
        user.suggestions = ["Set a new goal or habit to get started!"];
        await saveCurrentUser(user);
        updateSuggestionsDisplay();
    }
}

// Update mood display
function updateMoodDisplay() {
    const moodContainer = document.getElementById('mood-container');
    if (!moodContainer) return;

    const user = getCurrentUser();
    if (!user || !user.moods) {
        moodContainer.innerHTML = `
            <button onclick="showMoodSelector(event)" class="mood-btn">How are you feeling today?</button>
        `;
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const todayMood = user.moods.find(m => m.date === today);
    
    if (todayMood) {
        moodContainer.innerHTML = `
            <div class="mood-display">
                <span>Today's Mood: <span style="font-size:1.5em;">${getMoodEmoji(todayMood.mood)}</span> ${todayMood.mood}</span>
                <button onclick="showMoodSelector(event)" class="change-mood-btn">Change</button>
            </div>
            <div id="journal-entries" class="journal-entries-container"></div>
        `;
        
        // Load journal entries after creating the container
        loadJournalEntries();
    } else {
        moodContainer.innerHTML = `
            <button onclick="showMoodSelector(event)" class="mood-btn">How are you feeling today?</button>
            <div id="journal-entries" class="journal-entries-container"></div>
        `;
        
        // Load journal entries after creating the container
        loadJournalEntries();
    }
}

// Map mood to emoji
function getMoodEmoji(mood) {
    switch (mood) {
        case 'Great': return '😊';
        case 'Good': return '🙂';
        case 'Okay': return '😐';
        case 'Bad': return '😔';
        case 'Terrible': return '😢';
        default: return '';
    }
}

// Generate smart suggestions
async function generateSuggestions() {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        const suggestions = [];
        
        // Analyze completed goals
        const completedGoals = user.goals ? user.goals.filter(g => g.completed) : [];
        if (completedGoals.length > 0) {
            const lastGoal = completedGoals[completedGoals.length - 1];
            suggestions.push(`Based on your completed goal "${lastGoal.text}", you might enjoy setting a goal about ${getRelatedTopic(lastGoal.text)}`);
        }

        // Use today's mood if available
        const today = new Date().toISOString().split('T')[0];
        const todayMood = user.moods ? user.moods.find(m => m.date === today) : null;
        const moodToUse = todayMood ? todayMood.mood : (user.moods && user.moods.length > 0 ? user.moods[user.moods.length-1].mood : null);

        // Mood-based suggestion
        if (moodToUse) {
            if (['Great', 'Good'].includes(moodToUse)) {
                suggestions.push("You're in a good mood! Try setting a challenging or exciting goal today.");
            } else if (moodToUse === 'Okay') {
                suggestions.push("Feeling okay? Maybe set a small, achievable goal to boost your mood.");
            } else {
                suggestions.push("If you're not feeling your best, consider a self-care or wellness goal.");
            }
        }

        // Fallback if no suggestions
        if (suggestions.length === 0) {
            suggestions.push("Set a new goal or habit to get started!");
        }

        // Update suggestions in user data
        user.suggestions = suggestions;
        await saveCurrentUser(user);
    } catch (error) {
        console.error('Error generating suggestions:', error);
    }
}

// Get related topic for goal suggestions
function getRelatedTopic(goal) {
    const topics = {
        'exercise': 'fitness or nutrition',
        'read': 'learning or personal development',
        'study': 'academic achievement or skill development',
        'work': 'career growth or professional development',
        'sleep': 'health or wellness',
        'meditate': 'mindfulness or stress management'
    };
    
    for (const [key, value] of Object.entries(topics)) {
        if (goal.toLowerCase().includes(key)) {
            return value;
        }
    }
    
    return 'personal growth';
}

// Update suggestions display
function updateSuggestionsDisplay() {
    const suggestionsContainer = document.getElementById('suggestions-container');
    if (!suggestionsContainer) return;

    const user = getCurrentUser();
    if (!user || !user.suggestions) {
        suggestionsContainer.innerHTML = `
            <h6>Smart Suggestions</h6>
            <div class="suggestions-list">
                <p>Set a new goal or habit to get started!</p>
            </div>
        `;
        return;
    }
    
    suggestionsContainer.innerHTML = `
        <h6>Smart Suggestions</h6>
        <div class="suggestions-list">
            ${user.suggestions.map(s => `<p>${s}</p>`).join('')}
        </div>
    `;
}

// Set smart reminder
function setReminder(goalId, time) {
    const user = getCurrentUser();
    user.reminders.push({
        goalId: goalId,
        time: time,
        active: true
    });
    saveCurrentUser(user);
    scheduleReminder(goalId, time);
}

// Schedule reminder
function scheduleReminder(goalId, time) {
    const [hours, minutes] = time.split(':');
    const now = new Date();
    const reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    if (reminderTime < now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    const timeUntilReminder = reminderTime - now;
    
    setTimeout(() => {
        showReminder(goalId);
    }, timeUntilReminder);
}

// Show reminder
function showReminder(goalId) {
    const user = getCurrentUser();
    const goal = user.goals.find(g => g.id === goalId);
    
    if (goal && !goal.completed) {
        const reminder = document.createElement('div');
        reminder.className = 'reminder-popup';
        reminder.innerHTML = `
            <p>Time to work on your goal: ${goal.text}</p>
            <button onclick="this.parentElement.remove()">Dismiss</button>
        `;
        document.body.appendChild(reminder);
    }
}

// Update goals display
function updateGoalsDisplay() {
    const goalList = document.getElementById("goal-list");
    if (!goalList) return;

    const user = getCurrentUser();
    if (!user || !user.goals) return;

    goalList.innerHTML = '';
    user.goals.forEach(goal => {
        const goalItem = document.createElement("li");
        const textSpan = document.createElement("span");
        textSpan.textContent = goal.text;
        goalItem.appendChild(textSpan);
        addGoalClickHandler(goalItem);
        goalList.appendChild(goalItem);
    });
}

// Update habits display
function updateHabitsDisplay() {
    const habitList = document.getElementById("habits-list");
    if (!habitList) return;

    const user = getCurrentUser();
    if (!user || !user.habits) return;

    habitList.innerHTML = '';
    user.habits.forEach(habit => {
        const habitItem = document.createElement("li");
        const textSpan = document.createElement("span");
        textSpan.textContent = habit.text;
        habitItem.appendChild(textSpan);
        addHabitClickHandler(habitItem);
        habitList.appendChild(habitItem);
    });
}

function updateProgress(stats) {
    if (!stats) {
        console.error('Stats object is undefined');
        return;
    }
    
    const user = getCurrentUser();
    if (!user) {
        console.error('User not found');
        return;
    }
    
    // Update totals based on actual arrays
    stats.totalHabits = user.habits.length;
    stats.totalGoals = user.goals.length;
    
    const totalHGNum = stats.totalHabits + stats.totalGoals;
    const totalComplete = stats.habitsCompleted + stats.goalsCompleted;
    
    if (totalHGNum > 0) {
        stats.progressPercent = Math.round((100 / totalHGNum) * totalComplete);
    } else {
        stats.progressPercent = 0;
    }
    
    // Save the updated stats
    user.stats = stats;
    saveCurrentUser(user);
}

// Fetch and display leaderboard
async function loadLeaderboard() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/leaderboard`);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        const users = await response.json();
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        if (users.length === 0) {
            leaderboardList.innerHTML = '<p>No users yet.</p>';
            return;
        }
        leaderboardList.innerHTML = `
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>User</th>
                        <th>Goals</th>
                        <th>Habits</th>
                        <th>Streak</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map((u, i) => `
                        <tr${localStorage.getItem('username') === u.username ? ' class="current-user"' : ''}>
                            <td>${i + 1}</td>
                            <td>${u.username}</td>
                            <td>${u.stats.goalsCompleted}</td>
                            <td>${u.stats.habitsCompleted}</td>
                            <td>${u.stats.streak}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        // Add styles if not present
        if (!document.getElementById('leaderboard-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'leaderboard-styles';
            styleSheet.textContent = `
                .leaderboard-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: #014240;
                    color: #fff;
                    border-radius: 10px;
                    overflow: hidden;
                    margin-top: 10px;
                }
                .leaderboard-table th, .leaderboard-table td {
                    padding: 8px 12px;
                    text-align: center;
                }
                .leaderboard-table th {
                    background: #01332f;
                    font-weight: 600;
                }
                .leaderboard-table tr:nth-child(even) {
                    background: rgba(255,255,255,0.05);
                }
                .leaderboard-table tr.current-user {
                    background: #1a73e8;
                    color: #fff;
                    font-weight: bold;
                }
            `;
            document.head.appendChild(styleSheet);
        }
    } catch (error) {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (leaderboardList) leaderboardList.innerHTML = '<p>Error loading leaderboard.</p>';
        console.error('Error loading leaderboard:', error);
    }
}

// Display username
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('username-display').textContent = localStorage.getItem('username') || 'User';
});

// Initialize features
window.addEventListener("DOMContentLoaded", async () => {
    try {
        // Load user data
        await loadUserData();

        // Add event listener for Enter key on goal input
        const goalInput = document.getElementById("goal-input");
        goalInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                off();
                addGoal();
            }
        });

        // Add event listener for Enter key on habit input
        const habitInput = document.getElementById("habit-input");
        habitInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                offHabit();
                addHabit();
            }
        });

        // Fetch and display quote
         await displayRandomQuote();

        // Initialize mood tracking
        const user = await getCurrentUser();
        if (user) {
            if (!user.moods || user.moods.length === 0) {
                user.moods = [{
                    date: new Date(),
                    mood: 'Okay',
                    completedGoals: 0,
                    completedHabits: 0
                }];
                await saveCurrentUser(user);
            }
            updateMoodDisplay();
            
            // Initialize suggestions
            if (!user.suggestions || user.suggestions.length === 0) {
                user.suggestions = ["Set a new goal or habit to get started!"];
                await saveCurrentUser(user);
            }
            generateSuggestions();
            updateSuggestionsDisplay();
        }
        
        // Initialize reminders
        if (user && user.reminders) {
            user.reminders.forEach(reminder => {
                if (reminder.active) {
                    scheduleReminder(reminder.goalId, reminder.time);
                }
            });
        }

        await loadLeaderboard();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});


// Reflection functionality
// Add a dropdown for previous reflections
function addReflectionHistoryUI() {
    const container = document.getElementById('reflection-header');
    if (!container || document.getElementById('reflection-date-select')) return;
    
    const select = document.createElement('select');
    select.id = 'reflection-date-select';
    select.style.marginLeft = '16px';
    select.style.borderRadius = '8px';
    select.style.padding = '4px 8px';
    select.style.fontFamily = "'Wix Madefor Display', sans-serif";
    select.style.fontSize = '1rem';
    select.style.background = '#fff';
    select.style.border = '1.5px solid #76A5AF';
    select.style.color = '#014240';
    select.style.cursor = 'pointer';
    select.title = 'View previous reflections';
    container.insertBefore(select, container.firstChild);

    // Fetch all reflection dates
    const username = localStorage.getItem('username');
    if (!username) return;
    fetch(`${BACKEND_URL}/api/users/${username}/reflections`)
        .then(res => res.json())
        .then(data => {
            if (!data.reflections) return;
            // Populate dropdown with dates
            data.reflections.forEach(r => {
                const date = new Date(r.date);
                const option = document.createElement('option');
                option.value = date.toISOString().split('T')[0];
                option.textContent = date.toLocaleDateString();
                select.appendChild(option);
            });
            // Set default to today
            const today = new Date().toISOString().split('T')[0];
            select.value = today;
        });

    select.addEventListener('change', function() {
        loadReflectionForDate(this.value);
    });
}

function loadReflectionForDate(dateStr) {
    const username = localStorage.getItem('username');
    if (!username) return;
    fetch(`${BACKEND_URL}/api/users/${username}/reflections`)
        .then(res => res.json())
        .then(data => {
            if (!data.reflections) return;
            const found = data.reflections.find(r => r.date && new Date(r.date).toISOString().split('T')[0] === dateStr);
            document.getElementById('reflection-input').value = found ? found.text : '';
            document.getElementById('reflection-counter').textContent = `${found && found.text ? found.text.length : 0}/280`;
        });
}

function saveReflection() {
    const username = localStorage.getItem('username');
    if (!username) return;
    const reflection = document.getElementById('reflection-input').value;
    // Get the selected date from the dropdown, or use today if not present
    let dateStr = new Date().toISOString().split('T')[0];
    const dateSelect = document.getElementById('reflection-date-select');
    if (dateSelect) {
        dateStr = dateSelect.value;
    }
    fetch(`${BACKEND_URL}/api/users/${username}/reflection`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reflection, date: dateStr })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            const saveButton = document.getElementById('save-reflection-button');
            const originalText = saveButton.textContent;
            saveButton.textContent = 'Saved!';
            saveButton.style.backgroundColor = '#76A5AF';
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.style.backgroundColor = '';
            }, 2000);
            // Refresh dropdown if a new date was added
            if (dateSelect && !Array.from(dateSelect.options).some(opt => opt.value === dateStr)) {
                const option = document.createElement('option');
                option.value = dateStr;
                option.textContent = new Date(dateStr).toLocaleDateString();
                dateSelect.appendChild(option);
                dateSelect.value = dateStr;
            }
        }
    })
    .catch(error => console.error('Error saving reflection:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    addReflectionHistoryUI();
});

// Track which achievement popups have been shown in this session
const sessionShownBadges = new Set();
function renderBadges() {
    const badgesList = document.getElementById('badges-list');
    if (!badgesList) {
        console.error('Badges list element not found');
        return;
    }
    
    badgesList.innerHTML = '';
    
    //badges 
    const badgeDefs = [
        { key: 'firstGoal', label: 'First Goal!', emoji: '🌱', desc: 'Complete your first goal', check: user => user.stats && user.stats.goalsCompleted >= 1 },
        { key: 'goal5', label: '5 Goals!', emoji: '🎯', desc: 'Complete 5 goals', check: user => user.stats && user.stats.goalsCompleted >= 5 },
        { key: 'firstHabit', label: 'First Habit!', emoji: '💧', desc: 'Complete your first habit', check: user => user.stats && user.stats.habitsCompleted >= 1 },
        { key: 'habit10', label: '10 Habits!', emoji: '🌟', desc: 'Complete 10 habits', check: user => user.stats && user.stats.habitsCompleted >= 10 },
        { key: 'streak3', label: '3 Day Streak!', emoji: '🔥', desc: '3 day streak', check: user => user.stats && user.stats.streak >= 3 },
        { key: 'streak7', label: '7 Day Streak!', emoji: '🏆', desc: '7 day streak', check: user => user.stats && user.stats.streak >= 7 },
        { key: 'custom', label: "Amaze-Balls!", emoji: '🦄', desc: 'Just for being you!', check: user => true },
    ];

    const user = getCurrentUser();
    if (!user) {
        console.error('No user data available');
        return;
    }

    const unlockedBadges = new Set(user.unlockedBadges || []);

    badgeDefs.forEach(badge => {
        const wasUnlocked = unlockedBadges.has(badge.key);
        const isUnlocked = badge.check(user);
        
        // Debug logging
        console.log('User unlockedBadges:', user.unlockedBadges);
        console.log('Checking badge:', badge.key, 'isUnlocked:', isUnlocked, 'wasUnlocked:', wasUnlocked, 'sessionShown:', sessionShownBadges.has(badge.key));
        
        // Only show popup for badges not in unlockedBadges and not already shown in this session
        if (isUnlocked && !wasUnlocked && !sessionShownBadges.has(badge.key)) {
            if (badge.key !== 'custom' || (user.unlockedBadges && user.unlockedBadges.length === 0)) {
                showAchievementPopup(badge);
            }
            if (!user.unlockedBadges) user.unlockedBadges = [];
            if (!user.unlockedBadges.includes(badge.key)) {
                user.unlockedBadges.push(badge.key);
            }
            // Immediately update localStorage cache
            localStorage.setItem('currentUser', JSON.stringify(user));
            saveCurrentUser(user);
            sessionShownBadges.add(badge.key);
        }

        const badgeDiv = document.createElement('div');
        badgeDiv.className = 'badge' + (isUnlocked ? '' : ' locked');
        badgeDiv.title = badge.desc;
        badgeDiv.innerHTML = `
            <span class="badge-emoji">${badge.emoji}</span>
            <span class="badge-label">${badge.label}</span>
        `;
        badgeDiv.addEventListener('click', function(e) {
            e.stopPropagation();
            showBadgePopup(badge, isUnlocked);
        });
        badgesList.appendChild(badgeDiv);
    });
}

function showBadgePopup(badge, unlocked) {
//     // Remove any existing popup
if(unlocked == true){
    const existing = document.getElementById('badge-popup-overlay');
    if (existing) existing.remove();
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'badge-popup-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.18)';
    overlay.style.zIndex = 9999;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.animation = 'fadeIn 0.3s ease forwards';

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'badge-popup';
    popup.style.background = unlocked ? 'linear-gradient(135deg, #fff7e8 60%, #bfe3e0 100%)' : 'linear-gradient(135deg, #e3e3e3 60%, #e0e7ef 100%)';
    popup.style.border = unlocked ? '3px solid #76A5AF' : '3px dashed #bfc9d9';
    popup.style.borderRadius = '22px';
    popup.style.boxShadow = '0 8px 32px rgba(118, 165, 175, 0.18)';
    popup.style.padding = '32px 36px 28px 36px';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.alignItems = 'center';
    popup.style.position = 'relative';
    popup.style.minWidth = '260px';
    popup.style.maxWidth = '90vw';
    popup.style.textAlign = 'center';
    popup.style.animation = 'slideUp 0.5s ease forwards';

    // Add styles for animations
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(20px);
            }
            to { 
                opacity: 1;
                transform: translateY(0);
            }
        }
        @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }
    `;
    document.head.appendChild(styleSheet);

    // Add confetti effect
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '8px';
        confetti.style.height = '8px';
        confetti.style.background = ['#76A5AF', '#EA9999', '#014240'][Math.floor(Math.random() * 3)];
        confetti.style.borderRadius = '50%';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = '100%';
        confetti.style.animation = `confetti ${1 + Math.random() * 2}s ease-out forwards`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        popup.appendChild(confetti);
    }

    // Emoji
    const emoji = document.createElement('span');
    emoji.className = 'badge-emoji';
    emoji.textContent = badge.emoji;
    emoji.style.fontSize = '3.2rem';
    emoji.style.margin = '18px 0 10px 0';
    popup.appendChild(emoji);

    // Title
    const title = document.createElement('div');
    title.textContent = 'Achievement Unlocked!';
    title.style.fontFamily = "'DynaPuff', cursive, 'Wix Madefor Display', sans-serif";
    title.style.fontSize = '1.4rem';
    title.style.color = '#014240';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    popup.appendChild(title);

    // Badge name
    const badgeName = document.createElement('div');
    badgeName.className = 'badge-label';
    badgeName.textContent = badge.label;
    badgeName.style.fontSize = '1.25rem';
    badgeName.style.margin = '0 0 10px 0';
    badgeName.style.background = 'linear-gradient(90deg, #76A5AF 0%, #EA9999 100%)';
    badgeName.style.color = '#fff';
    badgeName.style.fontWeight = 'bold';
    badgeName.style.borderRadius = '18px';
    badgeName.style.padding = '8px 18px 7px 18px';
    badgeName.style.boxShadow = '0 2px 8px #bfe3e044';
    badgeName.style.border = '1.5px solid #fff7e8';
    badgeName.style.display = 'inline-block';
    popup.appendChild(badgeName);

    // Description
    const desc = document.createElement('div');
    desc.textContent = badge.desc;
    desc.style.fontFamily = "'Wix Madefor Display', sans-serif";
    desc.style.fontSize = '1.05rem';
    desc.style.color = '#014240';
    desc.style.margin = '10px 0 0 0';
    desc.style.padding = '0 8px';
    desc.style.lineHeight = '1.4';
    desc.style.maxWidth = '260px';
    popup.appendChild(desc);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '12px';
    closeBtn.style.right = '18px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '2rem';
    closeBtn.style.color = '#EA9999';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.lineHeight = '1';
    closeBtn.addEventListener('click', () => overlay.remove());
    popup.appendChild(closeBtn);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => overlay.remove(), 300);
        }
    }, 5000);
}
}

// Show achievement popup
function showAchievementPopup(badge) {
    // Remove any existing popup
    const existing = document.getElementById('achievement-popup-overlay');
    if (existing) existing.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'achievement-popup-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.18)';
    overlay.style.zIndex = 9999;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.animation = 'fadeIn 0.3s ease forwards';

    // Create popup 
 

    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.style.background = 'linear-gradient(135deg, #fff7e8 60%, #bfe3e0 100%)';
    popup.style.border = '3px solid #76A5AF';
    popup.style.borderRadius = '22px';
    popup.style.boxShadow = '0 8px 32px rgba(118, 165, 175, 0.18)';
    popup.style.padding = '32px 36px 28px 36px';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.alignItems = 'center';
    popup.style.position = 'relative';
    popup.style.minWidth = '260px';
    popup.style.maxWidth = '90vw';
    popup.style.textAlign = 'center';
    popup.style.animation = 'slideUp 0.5s ease forwards';

    // Add styles for animations
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(20px);
            }
            to { 
                opacity: 1;
                transform: translateY(0);
            }
        }
        @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }
    `;
    document.head.appendChild(styleSheet);

    // Add confetti effect
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '8px';
        confetti.style.height = '8px';
        confetti.style.background = ['#76A5AF', '#EA9999', '#014240'][Math.floor(Math.random() * 3)];
        confetti.style.borderRadius = '50%';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = '100%';
        confetti.style.animation = `confetti ${1 + Math.random() * 2}s ease-out forwards`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        popup.appendChild(confetti);
    }

    // Emoji
    const emoji = document.createElement('span');
    emoji.className = 'badge-emoji';
    emoji.textContent = badge.emoji;
    emoji.style.fontSize = '3.2rem';
    emoji.style.margin = '18px 0 10px 0';
    popup.appendChild(emoji);

    // Title
    const title = document.createElement('div');
    title.textContent = 'Achievement Unlocked!';
    title.style.fontFamily = "'DynaPuff', cursive, 'Wix Madefor Display', sans-serif";
    title.style.fontSize = '1.4rem';
    title.style.color = '#014240';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    popup.appendChild(title);

    // Badge name
    const badgeName = document.createElement('div');
    badgeName.className = 'badge-label';
    badgeName.textContent = badge.label;
    badgeName.style.fontSize = '1.25rem';
    badgeName.style.margin = '0 0 10px 0';
    badgeName.style.background = 'linear-gradient(90deg, #76A5AF 0%, #EA9999 100%)';
    badgeName.style.color = '#fff';
    badgeName.style.fontWeight = 'bold';
    badgeName.style.borderRadius = '18px';
    badgeName.style.padding = '8px 18px 7px 18px';
    badgeName.style.boxShadow = '0 2px 8px #bfe3e044';
    badgeName.style.border = '1.5px solid #fff7e8';
    badgeName.style.display = 'inline-block';
    popup.appendChild(badgeName);

    // Description
    const desc = document.createElement('div');
    desc.textContent = badge.desc;
    desc.style.fontFamily = "'Wix Madefor Display', sans-serif";
    desc.style.fontSize = '1.05rem';
    desc.style.color = '#014240';
    desc.style.margin = '10px 0 0 0';
    desc.style.padding = '0 8px';
    desc.style.lineHeight = '1.4';
    desc.style.maxWidth = '260px';
    popup.appendChild(desc);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '12px';
    closeBtn.style.right = '18px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '2rem';
    closeBtn.style.color = '#EA9999';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.lineHeight = '1';
    closeBtn.addEventListener('click', () => overlay.remove());
    popup.appendChild(closeBtn);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => overlay.remove(), 300);
        }
    }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
    renderBadges();
});

async function loadJournalEntries() {
    const username = localStorage.getItem('username');
    if (!username) return;

    // Get entries from localStorage
    const localStorageKey = `${username}_journal_entries`;
    let entries = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
    
    // Sort entries by date descending (newest first)
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Removed the slice(0, 6) to allow unlimited entries
    localStorage.setItem(localStorageKey, JSON.stringify(entries));
    
    // Display entries from localStorage immediately
    const journalEntriesDiv = document.getElementById('journal-entries');
    if (journalEntriesDiv) {
        journalEntriesDiv.innerHTML = '';
        entries.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'journal-entry';
            entryElement.innerHTML = `
                <p><strong>${new Date(entry.date).toLocaleString()}</strong></p>
                <p>${entry.text}</p>
                ${entry.mood ? `<p>Mood: ${entry.mood}</p>` : ''}
            `;
            journalEntriesDiv.appendChild(entryElement);
        });
    }

    try {
        // Fetch from MongoDB in the background
        const response = await fetch(`${BACKEND_URL}/api/users/${username}/journal`);
        if (!response.ok) {
            throw new Error('Failed to load journal entries');
        }
        const data = await response.json();
        
        // Update localStorage with MongoDB data (no limit)
        if (data.journalEntries && data.journalEntries.length > 0) {
            // Sort MongoDB data by date descending
            data.journalEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            localStorage.setItem(localStorageKey, JSON.stringify(data.journalEntries));
            
            // Update display with MongoDB data
            if (journalEntriesDiv) {
                journalEntriesDiv.innerHTML = '';
                data.journalEntries.forEach(entry => {
                    const entryElement = document.createElement('div');
                    entryElement.className = 'journal-entry';
                    entryElement.innerHTML = `
                        <p><strong>${new Date(entry.date).toLocaleString()}</strong></p>
                        <p>${entry.text}</p>
                        ${entry.mood ? `<p>Mood: ${entry.mood}</p>` : ''}
                    `;
                    journalEntriesDiv.appendChild(entryElement);
                });
            }
        } else if (data.journalEntries && data.journalEntries.length === 0) {
            // If MongoDB has no entries, clear localStorage as well
            localStorage.setItem(localStorageKey, JSON.stringify([]));
            if (journalEntriesDiv) {
                journalEntriesDiv.innerHTML = '';
            }
        }
    } catch (error) {
        console.error('Error loading journal entries from MongoDB:', error);
        // Keep showing localStorage data if MongoDB fetch fails
    }
}

// Call loadJournalEntries when the page loads
document.addEventListener('DOMContentLoaded', loadJournalEntries);
  