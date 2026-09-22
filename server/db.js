const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Use in-memory DB for development, file DB for production
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../data.sqlite')
  : ':memory:';

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_moderator BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date_start DATE NOT NULL,
      date_end DATE,
      created_by_user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by_user_id) REFERENCES users(id)
    )
  `);

  // Event todos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      todo_text TEXT NOT NULL,
      completed BOOLEAN DEFAULT 0,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_start);
    CREATE INDEX IF NOT EXISTS idx_events_user ON events(created_by_user_id);
  `);

  seedData();
}

// Seed with fake data for demo
function seedData() {
  // Check if data already exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return; // Already seeded

  // Create moderator account
  const moderatorPass = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (username, password_hash, is_moderator)
    VALUES (?, ?, 1)
  `).run('admin', moderatorPass);

  // Create demo user
  const demoPass = bcrypt.hashSync('demo123', 10);
  db.prepare(`
    INSERT INTO users (username, password_hash, is_moderator)
    VALUES (?, ?, 0)
  `).run('demo', demoPass);

  // Get user IDs
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  const demo = db.prepare('SELECT id FROM users WHERE username = ?').get('demo');

  // Create some fake events (mix of approved and pending)
  const events = [
    { title: 'Community Yoga', date_start: '2026-09-25', date_end: '2026-09-25', created_by: admin.id, status: 'approved', todos: ['Setup mats', 'Arrive 15min early'] },
    { title: 'Tech Talk - QA & AI', date_start: '2026-09-27', date_end: '2026-09-27', created_by: demo.id, status: 'pending', todos: ['Prepare slides'] },
    { title: 'Farmers Market', date_start: '2026-09-28', date_end: '2026-09-28', created_by: admin.id, status: 'approved', todos: [] },
  ];

  events.forEach(evt => {
    const result = db.prepare(`
      INSERT INTO events (title, date_start, date_end, created_by_user_id, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(evt.title, evt.date_start, evt.date_end, evt.created_by, evt.status);

    evt.todos.forEach(todo => {
      db.prepare(`
        INSERT INTO event_todos (event_id, todo_text)
        VALUES (?, ?)
      `).run(result.lastInsertRowid, todo);
    });
  });

  console.log('✓ Database seeded with demo data');
  console.log('  Moderator: admin / admin123');
  console.log('  Demo User: demo / demo123');
}

// Helper functions for queries
function getUserById(id) {
  return db.prepare('SELECT id, username, is_moderator, created_at FROM users WHERE id = ?').get(id);
}

function getUserByUsername(username) {
  return db.prepare('SELECT id, username, password_hash, is_moderator, created_at FROM users WHERE username = ?').get(username);
}

function getEventWithTodos(eventId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) return null;
  
  const todos = db.prepare('SELECT id, todo_text, completed FROM event_todos WHERE event_id = ?').all(eventId);
  return { ...event, todos };
}

function getApprovedEvents() {
  return db.prepare('SELECT * FROM events WHERE status = ? ORDER BY date_start ASC').all('approved');
}

function getPendingEvents() {
  return db.prepare('SELECT e.*, u.username as creator_username FROM events e JOIN users u ON e.created_by_user_id = u.id WHERE e.status = ? ORDER BY e.created_at ASC').all('pending');
}

module.exports = {
  db,
  initDb,
  getUserById,
  getUserByUsername,
  getEventWithTodos,
  getApprovedEvents,
  getPendingEvents
};
