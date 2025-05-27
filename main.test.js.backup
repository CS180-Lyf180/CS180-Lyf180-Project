import { fireEvent, render } from '@testing-library/dom';
import '@testing-library/jest-dom/extend-expect';
import './main'; 
describe('Add Goal Button', () => {
    let goalInput, addGoalButton, goalList;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="add-goal-overlay" style="display: none;">
                <div id="add-goal-form">
                    <input type="text" id="goal-input" placeholder="Enter your goal">
                    <button onclick="off(), addGoal()" id="submit-goal">Submit</button>
                </div>
            </div>
            <div id="goals">
                <div id="goal-list-container">
                    <ol id="goal-list"></ol>
                </div>
                <button onclick="on()" id="add-goal-button">Add Goal</button>
            </div>
        `;

        goalInput = document.getElementById("goal-input");
        addGoalButton = document.getElementById("add-goal-button");
        goalList = document.getElementById("goal-list");
    });

    test('should add a goal to the list when the button is clicked', () => {
        fireEvent.click(addGoalButton);
        goalInput.value = 'Learn JavaScript';
        fireEvent.click(document.getElementById("submit-goal"));

        expect(goalList.children.length).toBe(1);
        expect(goalList.children[0].textContent).toBe('Learn JavaScript');
    });

    test('should clear the input field after adding a goal', () => {
        fireEvent.click(addGoalButton);
        goalInput.value = 'Learn JavaScript';
        fireEvent.click(document.getElementById("submit-goal"));

        expect(goalInput.value).toBe('');
    });

    test('should not add an empty goal', () => {
        fireEvent.click(addGoalButton);
        goalInput.value = '';
        fireEvent.click(document.getElementById("submit-goal"));

        expect(goalList.children.length).toBe(0);
    });
});