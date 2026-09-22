const express = require('express');
const bcrypt = require('bcryptjs');
const { db, getUserByUsername, getUserById } = require('../db');

const router = express.Router();

/**
 * POST /api/auth/register
 * Public endpoint - anyone can create an account
 */
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Username min 3 chars, password min 4 chars' });
  }

  // Check if user exists
  const existing = getUserByUsername(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  // Hash password
  const passwordHash = bcrypt.hashSync(password, 10);

  // Create user
  try {
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, is_moderator)
      VALUES (?, ?, 0)
    `).run(username, passwordHash);

    const userId = result.lastInsertRowid;

    // Auto-login after registration
    req.session.userId = userId;
    req.session.username = username;
    req.session.isModerator = false;

    return res.status(201).json({
      success: true,
      message: 'Account created',
      userId,
      username
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * POST /api/auth/login
 * Public endpoint - sign in with credentials
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Check password
  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Set session
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.isModerator = Boolean(user.is_moderator);

  return res.json({
    success: true,
    message: 'Logged in',
    userId: user.id,
    username: user.username,
    isModerator: user.is_moderator
  });
});

/**
 * GET /api/auth/me
 * Get current user info if authenticated
 */
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = getUserById(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    userId: user.id,
    username: user.username,
    isModerator: Boolean(user.is_moderator)
  });
});

/**
 * POST /api/auth/logout
 * Sign out and destroy session
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    return res.json({ success: true, message: 'Logged out' });
  });
});

module.exports = router;
