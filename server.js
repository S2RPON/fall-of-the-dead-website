require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./database');
const path = require('path');

const app = express();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Global Template Variables
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    const dbWishlists = db.prepare('SELECT COUNT(*) as count FROM wishlist').get().count;
    res.locals.wishlistCount = 22 + dbWishlists; // Base 22 + real database additions
    next();
});

// --- Routes ---

// Home
app.get('/', (req, res) => {
    const news = db.prepare('SELECT * FROM news ORDER BY created_at DESC LIMIT 3').all();
    const phases = db.prepare('SELECT * FROM roadmap_phases ORDER BY order_index ASC').all();
    const features = db.prepare('SELECT * FROM roadmap_features').all();
    const roadmapData = phases.map(phase => {
        return { ...phase, features: features.filter(f => f.phase_id === phase.id) };
    });

    let isWishlisted = false;
    if (req.session.user) {
        const userId = req.session.user.id;
        isWishlisted = !!db.prepare('SELECT 1 FROM wishlist WHERE user_id = ?').get(userId);
    }

    res.render('index', { news, phases: roadmapData, isWishlisted });
});

// Roadmap
app.get('/roadmap', (req, res) => {
    const phases = db.prepare('SELECT * FROM roadmap_phases ORDER BY order_index ASC').all();
    const features = db.prepare('SELECT * FROM roadmap_features').all();
    const roadmapData = phases.map(phase => {
        return { ...phase, features: features.filter(f => f.phase_id === phase.id) };
    });
    res.render('roadmap', { phases: roadmapData });
});

// Auth: Register
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) throw new Error('All fields are required');
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        try {
            db.prepare('INSERT INTO users (username, email, password, verifyCode) VALUES (?, ?, ?, ?)').run(username, email, hashedPassword, verifyCode);
        } catch (dbErr) {
            return res.render('register', { error: 'Username or Email already exists.' });
        }
        
        // Try to send the email, but enforce an 8-second timeout
        try {
            const mailPromise = transporter.sendMail({
                from: `"Fall Of The Dead" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Fall Of The Dead - Verification Code',
                html: `<div style="background-color: #0a0b0d; color: #e0e0e0; padding: 30px; font-family: Arial, sans-serif; text-align: center;"><h1 style="color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">Fall Of The Dead</h1><hr style="border-color: #333; margin: 20px 0;"><h2>Welcome, ${username}!</h2><p style="color: #aaa;">Use this 6-digit code to verify your account:</p><h1 style="color: #8b0000; font-size: 40px; letter-spacing: 10px;">${verifyCode}</h1></div>`
            });
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Email timeout')), 8000)
            );

            await Promise.race([mailPromise, timeoutPromise]);
            
            // If email sends successfully, go to verify page
            res.render('verify', { email, error: null, fallbackCode: null });
        } catch (mailErr) {
            // If email fails OR takes longer than 8 seconds, give the code on screen
            console.error('Email failed or timed out:', mailErr.message);
            return res.render('verify', { email, error: null, fallbackCode: verifyCode });
        }
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'An unexpected error occurred.' });
    }
});

app.get('/verify', (req, res) => {
    const email = req.query.email || '';
    res.render('verify', { email, error: null, fallbackCode: null });
});

app.post('/verify', (req, res) => {
    const { email, code } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND verifyCode = ?').get(email, code);
    if (user) {
        db.prepare('UPDATE users SET isVerified = 1, verifyCode = NULL WHERE id = ?').run(user.id);
        res.render('login', { success: 'Email verified! You can now log in.', error: null });
    } else {
        res.render('verify', { email, error: 'Invalid verification code.', fallbackCode: null });
    }
});

// Auth: Login
app.get('/login', (req, res) => res.render('login', { error: null, success: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (user && await bcrypt.compare(password, user.password)) {
        if (user.isVerified === 0) return res.render('login', { error: 'Please verify your email before logging in.', success: null });
        req.session.user = { id: user.id, username: user.username, role: user.role };
        res.redirect('/');
    } else {
        res.render('login', { error: 'Invalid credentials.', success: null });
    }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// Wishlist API
app.post('/api/wishlist', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Login required' });
    const userId = req.session.user.id;
    const exists = db.prepare('SELECT 1 FROM wishlist WHERE user_id = ?').get(userId);
    if (exists) {
        db.prepare('DELETE FROM wishlist WHERE user_id = ?').run(userId);
        res.json({ status: 'removed' });
    } else {
        db.prepare('INSERT INTO wishlist (user_id) VALUES (?)').run(userId);
        res.json({ status: 'added' });
    }
});

// Support
app.get('/support', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const tickets = db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC').all(req.session.user.id);
    res.render('support', { tickets });
});
app.post('/support', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { subject, description } = req.body;
    db.prepare('INSERT INTO tickets (user_id, subject, description) VALUES (?, ?, ?)').run(req.session.user.id, subject, description);
    res.redirect('/support');
});

// Admin
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
    const users = db.prepare('SELECT id, username, email, role FROM users').all();
    const tickets = db.prepare('SELECT * FROM tickets').all();
    const news = db.prepare('SELECT * FROM news').all();
    const roadmap = db.prepare('SELECT * FROM roadmap_features').all();
    res.render('admin', { users, tickets, news, roadmap });
});
app.post('/admin/roadmap/update', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).send('Forbidden');
    const { featureId, status } = req.body;
    db.prepare('UPDATE roadmap_features SET status = ? WHERE id = ?').run(status, featureId);
    res.redirect('/admin');
});
app.post('/admin/ticket/reply', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).send('Forbidden');
    const { ticketId, admin_reply } = req.body;
    db.prepare('UPDATE tickets SET admin_reply = ?, status = "Solved" WHERE id = ?').run(admin_reply, ticketId);
    res.redirect('/admin');
});

// Create Admin User
const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get(process.env.ADMIN_USERNAME);
if (!adminUser) {
    const hashedAdminPass = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    db.prepare('INSERT INTO users (username, email, password, role, isVerified) VALUES (?, ?, ?, ?, ?)').run(process.env.ADMIN_USERNAME, 'admin@fotd.com', hashedAdminPass, 'admin', 1);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));