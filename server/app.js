const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const moderationRoutes = require('./routes/moderation');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDb();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/moderation', moderationRoutes);

// Catch-all: serve index.html for SPA navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/moderation', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/moderation.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📅 Calendar View AI - Development Server                 ║
║                                                            ║
║  Server: http://localhost:${PORT}                           ║
║  API: http://localhost:${PORT}/api                         ║
║                                                            ║
║  Demo Credentials:                                        ║
║    Moderator: admin / admin123                           ║
║    User: demo / demo123                                  ║
║                                                            ║
║  Endpoints:                                               ║
║    GET  /api/events              (get approved events)    ║
║    POST /api/events              (create event)           ║
║    GET  /api/moderation/pending  (mod only)               ║
║    POST /api/auth/login          (sign in)                ║
║    POST /api/auth/register       (sign up)                ║
║                                                            ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
