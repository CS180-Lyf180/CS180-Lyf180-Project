const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files from current directory

// MongoDB connection
const uri = process.env.MONGODB_URI;
const clientOptions = {
    serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true
    }
};

mongoose.connect(uri, clientOptions)
    .then(async () => {
        console.log('Successfully connected to MongoDB Atlas!');
        
        // Migration: Ensure all reflections have proper structure
        try {
            const users = await User.find({});
            for (const user of users) {
                let needsUpdate = false;
                if (user.reflections && user.reflections.length > 0) {
                    user.reflections = user.reflections.map(reflection => {
                        // Ensure each reflection has date and text fields
                        if (!reflection.date) {
                            reflection.date = new Date();
                            needsUpdate = true;
                        }
                        if (typeof reflection === 'string') {
                            // Old format was just a string
                            reflection = { date: new Date(), text: reflection };
                            needsUpdate = true;
                        }
                        return reflection;
                    });
                    
                    if (needsUpdate) {
                        await user.save();
                        console.log(`Updated reflections structure for user: ${user.username}`);
                    }
                }
            }
            console.log('Migration check completed');
        } catch (migrationError) {
            console.error('Migration error:', migrationError);
        }
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    goals: [{
        text: String,
        completed: Boolean,
        createdAt: { type: Date, default: Date.now }
    }],
    habits: [{
        text: String,
        completed: Boolean,
        createdAt: { type: Date, default: Date.now }
    }],
    stats: {
        goalsCompleted: { type: Number, default: 0 },
        habitsCompleted: { type: Number, default: 0 },
        streak: { type: Number, default: 0 }
    },
    moods: [{
        date: Date,
        mood: String,
        completedGoals: Number,
        completedHabits: Number
    }],
    reminders: [{
        goalId: String,
        time: String,
        active: Boolean
    }],
    suggestions: [String],
    reflections: [{
        date: { type: Date, default: Date.now },
        text: String,
        mood: String
    }],
    unlockedBadges: [String]
});

const User = mongoose.model('User', userSchema);

// Quotes API endpoint
app.get('/api/quote', (req, res) => {
    const quotes = [
        "The journey of a thousand miles begins with a single step.",
        "Believe you can and you're halfway there.",
        "Every day is a new beginning.",
        "Small progress is still progress.",
        "You are capable of amazing things.",
        "Make today ridiculously amazing.",
        "Your potential is limitless.",
        "Dream big, work hard.",
        "Be the change you wish to see.",
        "Today is your day!"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    res.json({ quote: randomQuote });
});

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Log API key status (without exposing the actual key)
console.log('OpenAI API Key Status:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');

// OpenAI API endpoint for journal analysis
app.post('/api/analyze-journal', async (req, res) => {
    try {
        const { journalEntry, mood } = req.body;
        
        const prompt = `Analyze this journal entry and mood, then provide exactly 5 personalized suggestions for goals or habits that would be beneficial. 
        The suggestions should be specific, actionable, and relevant to the user's current state.
        
        Journal Entry: "${journalEntry}"
        Current Mood: ${mood}
        
        Return ONLY a JSON array of exactly 5 strings. Each suggestion should:
        - Start with a capital letter
        - End with a period
        - Be 10-20 words long
        - Be a complete sentence
        - Not include any special characters or formatting
        
        Example format: ["Start a daily 10-minute meditation practice.", "Take a 30-minute walk after lunch each day.", "Read one chapter of a book before bed.", "Practice deep breathing exercises for 5 minutes each morning.", "Write down three things you're grateful for every evening."]`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful life coach that provides personalized suggestions based on journal entries and moods. Always respond with exactly 5 suggestions in a JSON array of strings. Each suggestion must be a complete sentence, start with a capital letter, end with a period, and be 10-20 words long."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 250
        });

        // Clean the response to ensure it's valid JSON
        const responseText = completion.choices[0].message.content.trim();
        const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const suggestions = JSON.parse(cleanResponse);
        
        // Validate suggestions format
        if (!Array.isArray(suggestions) || suggestions.length !== 5) {
            throw new Error('Invalid suggestions format');
        }
        
        // Ensure each suggestion follows the format
        const formattedSuggestions = suggestions.map(suggestion => {
            // Capitalize first letter
            suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
            // Ensure it ends with a period
            if (!suggestion.endsWith('.')) {
                suggestion += '.';
            }
            return suggestion;
        });
        
        res.json({ suggestions: formattedSuggestions });
    } catch (error) {
        console.error('Error analyzing journal:', error);
        res.status(500).json({ error: 'Failed to analyze journal entry' });
    }
});

// API Routes
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Registration attempt for username:', username);
        
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log('Username already exists:', username);
            return res.status(400).json({ error: 'Username already exists' });
        }

        const user = new User({
            username,
            password,
            goals: [],
            habits: [],
            stats: {
                goalsCompleted: 0,
                habitsCompleted: 0,
                streak: 0
            },
            moods: [{
                date: new Date(),
                mood: 'Okay',
                completedGoals: 0,
                completedHabits: 0
            }],
            reminders: [],
            suggestions: ["Set a new goal or habit to get started!"],
            reflections: [],
            unlockedBadges: ["custom"]
        });
        
        console.log('Saving new user...');
        await user.save();
        console.log('User saved successfully');
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Registration error details:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ message: 'Login successful' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (user) {
            // Only update fields that are present in req.body
            // EXCLUDE reflections from being updated via PUT to prevent overwriting journal entries
            Object.keys(req.body).forEach(key => {
                if (key !== 'reflections') {  // Skip reflections field
                    user[key] = req.body[key];
                }
            });
            await user.save();
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Leaderboard API endpoint
app.get('/api/leaderboard', async (req, res) => {
    try {
        // Sort by goalsCompleted, then habitsCompleted, then streak (all descending)
        const users = await User.find({}, 'username stats')
            .sort({ 'stats.goalsCompleted': -1, 'stats.habitsCompleted': -1, 'stats.streak': -1 })
            .limit(10);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save reflection endpoint
app.post('/api/users/:username/reflection', async (req, res) => {
    try {
        const { username } = req.params;
        const { reflection, date } = req.body;
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Use provided date or today
        let targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        // Find reflection for the target date if it exists
        const existingReflection = user.reflections.find(r => {
            const reflectionDate = new Date(r.date);
            reflectionDate.setHours(0, 0, 0, 0);
            return reflectionDate.getTime() === targetDate.getTime();
        });

        if (existingReflection) {
            // Update existing reflection
            existingReflection.text = reflection;
        } else {
            // Add new reflection
            user.reflections.push({ date: targetDate, text: reflection });
        }
        // Sort reflections by date descending (newest first)
        user.reflections.sort((a, b) => new Date(b.date) - new Date(a.date));
        // Removed the slice(0, 6) to allow unlimited entries
        await user.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get today's reflection endpoint
app.get('/api/users/:username/reflection/today', async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find today's reflection
        const todayReflection = user.reflections.find(r => {
            const reflectionDate = new Date(r.date);
            reflectionDate.setHours(0, 0, 0, 0);
            return reflectionDate.getTime() === today.getTime();
        });

        res.json({ reflection: todayReflection ? todayReflection.text : '' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all reflections for a user, sorted by date descending
app.get('/api/users/:username/reflections', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Sort reflections by date descending
        const reflections = user.reflections.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ reflections });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to store a mood for a user
app.post('/api/users/:username/mood', async (req, res) => {
    try {
        console.log('Received mood request:', req.params.username, req.body);
        const { username } = req.params;
        const { mood } = req.body;
        if (!mood) {
            console.log('No mood provided in request');
            return res.status(400).json({ error: 'Mood is required' });
        }
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found:', username);
            return res.status(404).json({ error: 'User not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find today's mood if it exists
        const existingMoodIndex = user.moods.findIndex(m => {
            const moodDate = new Date(m.date);
            moodDate.setHours(0, 0, 0, 0);
            return moodDate.getTime() === today.getTime();
        });

        if (existingMoodIndex !== -1) {
            console.log('Updating existing mood for user:', username);
            // Update existing mood
            user.moods[existingMoodIndex].mood = mood;
        } else {
            console.log('Adding new mood for user:', username);
            // Add new mood
            user.moods.push({
                date: today,
                mood: mood,
                completedGoals: user.goals ? user.goals.filter(g => g.completed).length : 0,
                completedHabits: user.habits ? user.habits.filter(h => h.completed).length : 0
            });
        }

        await user.save();
        console.log('Successfully saved mood for user:', username);
        return res.status(201).json({ message: 'Mood saved successfully', mood: mood });
    } catch (error) {
        console.error('Error saving mood:', error);
        return res.status(500).json({ error: 'Failed to save mood' });
    }
});

// New endpoint to store a journal entry for a user
app.post('/api/users/:username/journal', async (req, res) => {
    try {
        console.log('Received journal request:', req.params.username, req.body);
        const { username } = req.params;
        const { journalEntry, mood } = req.body;  // Accept mood from request
        if (!journalEntry) {
            console.log('No journal entry provided in request');
            return res.status(400).json({ error: 'Journal entry is required' });
        }
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found:', username);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Log current reflections count before adding
        console.log(`Current reflections count for ${username}: ${user.reflections.length}`);
        
        // Add the journal entry to the user's reflections array with mood
        const newReflection = { 
            date: new Date(), 
            text: journalEntry
        };
        // Only add mood if it's provided
        if (mood) {
            newReflection.mood = mood;
        }
        user.reflections.push(newReflection);
        
        // Sort reflections by date descending (newest first)
        user.reflections.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Log reflections count after adding
        console.log(`New reflections count for ${username}: ${user.reflections.length}`);
        console.log(`Latest reflection: ${JSON.stringify(user.reflections[0])}`);
        
        // Save and verify
        await user.save();
        
        // Fetch the user again to verify save
        const verifyUser = await User.findOne({ username });
        console.log(`Verified reflections count after save: ${verifyUser.reflections.length}`);
        
        console.log('Successfully saved journal entry for user:', username);
        return res.status(201).json({ 
            message: 'Journal entry saved successfully', 
            entry: journalEntry,
            mood: mood,
            totalEntries: verifyUser.reflections.length
        });
    } catch (error) {
        console.error('Error saving journal entry:', error);
        return res.status(500).json({ error: 'Failed to save journal entry' });
    }
});

// New endpoint to retrieve journal entries for a user
app.get('/api/users/:username/journal', async (req, res) => {
    try {
        console.log('Received journal request for user:', req.params.username);
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found:', username);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Log detailed information about reflections
        console.log(`Total reflections for ${username}: ${user.reflections.length}`);
        if (user.reflections.length > 0) {
            console.log(`First reflection: ${JSON.stringify(user.reflections[0])}`);
            console.log(`Last reflection: ${JSON.stringify(user.reflections[user.reflections.length - 1])}`);
        }
        
        // Ensure reflections are sorted by date descending
        user.reflections.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('Successfully retrieved journal entries for user:', username);
        res.json({ journalEntries: user.reflections });
    } catch (error) {
        console.error('Error retrieving journal entries:', error);
        res.status(500).json({ error: 'Failed to retrieve journal entries' });
    }
});

// Debug endpoint to check user schema
app.get('/api/users/:username/debug', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if reflections field exists
        if (!user.reflections) {
            console.log(`User ${username} has no reflections field, initializing...`);
            user.reflections = [];
            await user.save();
        }
        
        // Get raw document from MongoDB
        const rawUser = await User.collection.findOne({ username });
        
        res.json({
            username: user.username,
            reflectionsCount: user.reflections ? user.reflections.length : 0,
            reflectionsFieldExists: !!user.reflections,
            reflectionsType: Array.isArray(user.reflections) ? 'array' : typeof user.reflections,
            sampleReflection: user.reflections && user.reflections.length > 0 ? user.reflections[0] : null,
            rawReflectionsCount: rawUser.reflections ? rawUser.reflections.length : 0,
            schemaVersion: user.__v
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 