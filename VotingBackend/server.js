// Import packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up sessions (IMPORTANT)
app.use(session({
    secret: 'secret-key-here', // Change this secret to something harder
    resave: false,
    saveUninitialized: false
}));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/voting-system', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// MongoDB Voter Model
const voterSchema = new mongoose.Schema({
    voterId: String,
    candidate: String
});
const Voter = mongoose.model('Voter', voterSchema);

// ADMIN CREDENTIALS
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123';

// Protect Admin Page
app.get('/admin.html', (req, res, next) => {
    if (req.session && req.session.admin) {
        next(); // allow to open admin.html
    } else {
        res.redirect('/admin-login.html'); // send back to login
    }
});

// Admin Login Route
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.admin = true; // mark session as admin
        res.status(200).send('Login successful!');
    } else {
        res.status(401).send('Login failed!');
    }
});

// Voting Route
app.post('/vote', async (req, res) => {
    const { voterId, candidate } = req.body;
    try {
        const existingVote = await Voter.findOne({ voterId });
        if (existingVote) {
            return res.status(400).json({ message: 'You have already voted!' });
        }

        const newVote = new Voter({ voterId, candidate });
        await newVote.save();
        res.status(200).json({ message: 'Vote submitted successfully!' });
    } catch (err) {
        console.error('Error submitting vote:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Results Route
app.get('/results', async (req, res) => {
    try {
        const votes = await Voter.aggregate([
            { $group: { _id: "$candidate", count: { $sum: 1 } } }
        ]);
        res.json(votes);
    } catch (err) {
        console.error('Error fetching results:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reset Votes Route
app.post('/reset', async (req, res) => {
    try {
        await Voter.deleteMany({});
        res.status(200).json({ message: 'All votes reset successfully!' });
    } catch (err) {
        console.error('Error resetting votes:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Static Files (VERY IMPORTANT - this must be AFTER protections)
app.use(express.static(__dirname));

// Server Running
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
