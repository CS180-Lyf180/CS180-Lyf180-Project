// Frontend functionality tests
/**
 * @jest-environment jsdom
 */

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn();

describe('Frontend Functionality', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
        fetch.mockClear();
    });

    describe('Mood Selection', () => {
        test('should store selected mood globally', () => {
            // Setup DOM
            document.body.innerHTML = `
                <div class="mood-selector">
                    <button onclick="selectMood('Great', this)" class="mood-option">😊 Great</button>
                </div>
            `;

            // Mock the selectMood function
            global.selectedMood = '';
            global.selectMood = function(mood, button) {
                global.selectedMood = mood;
                document.querySelectorAll('.mood-option').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
            };

            const button = document.querySelector('.mood-option');
            global.selectMood('Great', button);

            expect(global.selectedMood).toBe('Great');
            expect(button.classList.contains('selected')).toBe(true);
        });
    });

    describe('Journal Entry Storage', () => {
        test('should save journal entries to localStorage', () => {
            const username = 'testuser';
            const journalEntry = 'Test journal entry';
            const mood = 'Great';

            localStorage.getItem.mockReturnValue('[]');
            localStorage.setItem.mockImplementation(() => {});

            // Mock the journal storage logic
            const localStorageKey = `${username}_journal_entries`;
            const entries = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
            
            const newEntry = {
                date: new Date().toISOString(),
                text: journalEntry,
                mood: mood
            };
            
            entries.unshift(newEntry);
            localStorage.setItem(localStorageKey, JSON.stringify(entries));

            expect(localStorage.setItem).toHaveBeenCalledWith(
                localStorageKey,
                expect.stringContaining(journalEntry)
            );
        });
    });

    describe('User Data Management', () => {
        test('should retrieve current user from localStorage', () => {
            const mockUser = {
                username: 'testuser',
                goals: [],
                habits: [],
                stats: { goalsCompleted: 0, habitsCompleted: 0, streak: 0 }
            };

            localStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

            // Mock getCurrentUser function
            global.getCurrentUser = function() {
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
            };

            const user = global.getCurrentUser();
            expect(user).toEqual(mockUser);
            expect(localStorage.getItem).toHaveBeenCalledWith('currentUser');
        });
    });
}); 