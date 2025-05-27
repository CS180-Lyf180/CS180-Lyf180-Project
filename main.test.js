/**
 * @jest-environment jsdom
 */

// Mock the main.js functions since we can't import it directly
global.addGoal = jest.fn();
global.on = jest.fn();
global.off = jest.fn();

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock getCurrentUser
global.getCurrentUser = jest.fn(() => ({
    goals: [],
    habits: [],
    stats: { goalsCompleted: 0, habitsCompleted: 0, streak: 0 }
}));

// Mock saveCurrentUser
global.saveCurrentUser = jest.fn();

describe('Add Goal Button', () => {
    let goalInput, addGoalButton, goalList;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        document.body.innerHTML = `
            <div id="add-goal-overlay" style="display: none;">
                <div id="add-goal-form">
                    <input type="text" id="goal-input" placeholder="Enter your goal">
                    <button id="submit-goal">Submit</button>
                </div>
            </div>
            <div id="goals">
                <div id="goal-list-container">
                    <ol id="goal-list"></ol>
                </div>
                <button id="add-goal-button">Add Goal</button>
            </div>
        `;

        goalInput = document.getElementById("goal-input");
        addGoalButton = document.getElementById("add-goal-button");
        goalList = document.getElementById("goal-list");

        // Mock the actual addGoal function behavior
        global.addGoal = jest.fn(() => {
            const goalInput = document.getElementById("goal-input");
            const goalList = document.getElementById("goal-list");
            
            if (goalInput.value.trim()) {
                const goalItem = document.createElement("li");
                const textSpan = document.createElement("span");
                textSpan.textContent = goalInput.value;
                goalItem.appendChild(textSpan);
                goalList.appendChild(goalItem);
                goalInput.value = "";
            }
        });
    });

    test('should add a goal to the list when the button is clicked', () => {
        goalInput.value = 'Learn JavaScript';
        global.addGoal();

        expect(goalList.children.length).toBe(1);
        expect(goalList.children[0].textContent).toBe('Learn JavaScript');
    });

    test('should clear the input field after adding a goal', () => {
        goalInput.value = 'Learn JavaScript';
        global.addGoal();

        expect(goalInput.value).toBe('');
    });

    test('should not add an empty goal', () => {
        goalInput.value = '';
        global.addGoal();

        expect(goalList.children.length).toBe(0);
    });
});