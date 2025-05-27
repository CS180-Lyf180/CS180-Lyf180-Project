// Integration tests for complete user workflows
const request = require('supertest');
const mongoose = require('mongoose');

// Note: You'll need to export your app from server.js for testing
// Add this line to the end of server.js: module.exports = app;

describe('Integration Tests - Complete User Workflows', () => {
    let app;
    let testUser = {
        username: 'integrationtest_' + Date.now(),
        password: 'testpass123'
    };

    beforeAll(async () => {
        // Import app after setting test environment
        process.env.NODE_ENV = 'test';
        app = require('../server');
        
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || process.env.MONGODB_URI);
        }
    });

    afterAll(async () => {
        // Clean up test data
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.collection('users').deleteOne({ username: testUser.username });
            await mongoose.connection.close();
        }
    });

    describe('Complete User Journey', () => {
        test('User registration → login → journal entry → mood tracking', async () => {
            // Step 1: Register user
            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(testUser)
                .expect(201);
            
            expect(registerResponse.body.message).toBe('User created successfully');

            // Step 2: Login user
            const loginResponse = await request(app)
                .post('/api/users/login')
                .send(testUser)
                .expect(200);
            
            expect(loginResponse.body.message).toBe('Login successful');

            // Step 3: Add journal entry
            const journalData = {
                journalEntry: 'Integration test journal entry',
                mood: 'Great'
            };

            const journalResponse = await request(app)
                .post(`/api/users/${testUser.username}/journal`)
                .send(journalData)
                .expect(201);
            
            expect(journalResponse.body.totalEntries).toBe(1);

            // Step 4: Track mood
            const moodResponse = await request(app)
                .post(`/api/users/${testUser.username}/mood`)
                .send({ mood: 'Great' })
                .expect(201);
            
            expect(moodResponse.body.mood).toBe('Great');

            // Step 5: Retrieve user data
            const userResponse = await request(app)
                .get(`/api/users/${testUser.username}`)
                .expect(200);
            
            expect(userResponse.body.username).toBe(testUser.username);
            expect(userResponse.body.reflections).toHaveLength(1);
            expect(userResponse.body.moods).toHaveLength(1);
        });

        test('Multiple journal entries maintain order', async () => {
            const entries = [
                { journalEntry: 'First entry', mood: 'Good' },
                { journalEntry: 'Second entry', mood: 'Great' },
                { journalEntry: 'Third entry', mood: 'Okay' }
            ];

            // Add multiple entries
            for (const entry of entries) {
                await request(app)
                    .post(`/api/users/${testUser.username}/journal`)
                    .send(entry)
                    .expect(201);
                
                // Small delay to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Retrieve entries
            const response = await request(app)
                .get(`/api/users/${testUser.username}/journal`)
                .expect(200);
            
            expect(response.body.journalEntries).toHaveLength(4); // 1 from previous test + 3 new
            
            // Check that entries are in descending order (newest first)
            const timestamps = response.body.journalEntries.map(entry => new Date(entry.date));
            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i-1].getTime()).toBeGreaterThanOrEqual(timestamps[i].getTime());
            }
        });
    });

    describe('Error Handling', () => {
        test('Should handle invalid journal data gracefully', async () => {
            await request(app)
                .post(`/api/users/${testUser.username}/journal`)
                .send({ journalEntry: '' }) // Empty journal entry
                .expect(400);
        });

        test('Should handle non-existent user requests', async () => {
            await request(app)
                .get('/api/users/nonexistentuser/journal')
                .expect(404);
        });
    });
}); 