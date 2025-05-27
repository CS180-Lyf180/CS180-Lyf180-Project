// Comprehensive API Test Suite
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('API Endpoints', () => {
    let testUser = {
        username: 'testuser_' + Date.now(),
        password: 'testpass123'
    };

    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_TEST_URI || process.env.MONGODB_URI);
    });

    afterAll(async () => {
        // Clean up test user
        await mongoose.connection.db.collection('users').deleteOne({ username: testUser.username });
        await mongoose.connection.close();
    });

    describe('User Authentication', () => {
        test('POST /api/users/register - should create new user', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send(testUser)
                .expect(201);
            
            expect(response.body.message).toBe('User created successfully');
        });

        test('POST /api/users/login - should login existing user', async () => {
            const response = await request(app)
                .post('/api/users/login')
                .send(testUser)
                .expect(200);
            
            expect(response.body.message).toBe('Login successful');
        });

        test('POST /api/users/register - should reject duplicate username', async () => {
            await request(app)
                .post('/api/users/register')
                .send(testUser)
                .expect(400);
        });
    });

    describe('Journal Functionality', () => {
        test('POST /api/users/:username/journal - should save journal entry', async () => {
            const journalData = {
                journalEntry: 'Test journal entry',
                mood: 'Great'
            };

            const response = await request(app)
                .post(`/api/users/${testUser.username}/journal`)
                .send(journalData)
                .expect(201);
            
            expect(response.body.message).toBe('Journal entry saved successfully');
            expect(response.body.entry).toBe(journalData.journalEntry);
        });

        test('GET /api/users/:username/journal - should retrieve journal entries', async () => {
            const response = await request(app)
                .get(`/api/users/${testUser.username}/journal`)
                .expect(200);
            
            expect(response.body.journalEntries).toBeDefined();
            expect(Array.isArray(response.body.journalEntries)).toBe(true);
        });
    });

    describe('Mood Tracking', () => {
        test('POST /api/users/:username/mood - should save mood', async () => {
            const moodData = { mood: 'Great' };

            const response = await request(app)
                .post(`/api/users/${testUser.username}/mood`)
                .send(moodData)
                .expect(201);
            
            expect(response.body.message).toBe('Mood saved successfully');
        });
    });
}); 