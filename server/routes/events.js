const express = require('express');
const { db, getEventWithTodos, getApprovedEvents } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/events
 * Public endpoint - get all APPROVED events (public calendar)
 */
router.get('/', (req, res) => {
  const events = getApprovedEvents();

  // Fetch todos for each event
  const eventsWithTodos = events.map(evt => ({
    ...evt,
    todos: db.prepare('SELECT id, todo_text, completed FROM event_todos WHERE event_id = ?')
      .all(evt.id)
  }));

  return res.json(eventsWithTodos);
});

/**
 * POST /api/events
 * Authenticated - create new event (goes to pending by default, or approved for admins)
 * Body: { title, date_start, date_end, todos: ["todo1", "todo2"] }
 */
router.post('/', requireAuth, (req, res) => {
  const { title, date_start, date_end, todos } = req.body;
  const userId = req.session.userId;
  const isModerator = req.session.isModerator;

  // Validate
  if (!title || !date_start || !date_end) {
    return res.status(400).json({ error: 'Title, date_start, and date_end are required' });
  }

  if (title.trim().length === 0) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }

  // Validate start date is not in the past
  const today = new Date().toISOString().split('T')[0];
  if (date_start < today) {
    return res.status(400).json({ error: 'Start date cannot be in the past' });
  }

  // Validate end date is not before start date
  if (date_end < date_start) {
    return res.status(400).json({ error: 'End date cannot be earlier than start date' });
  }

  try {
    // Determine status: 'approved' for admins, 'pending' for regular users
    const status = isModerator ? 'approved' : 'pending';

    // Insert event
    const result = db.prepare(`
      INSERT INTO events (title, date_start, date_end, created_by_user_id, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, date_start, date_end, userId, status);

    const eventId = result.lastInsertRowid;

    // Insert todos if provided
    if (Array.isArray(todos) && todos.length > 0) {
      const insertTodo = db.prepare('INSERT INTO event_todos (event_id, todo_text) VALUES (?, ?)');
      todos.forEach(todo => {
        if (todo.trim().length > 0) {
          insertTodo.run(eventId, todo.trim());
        }
      });
    }

    const newEvent = getEventWithTodos(eventId);
    const message = isModerator ? 'Event created successfully!' : 'Event submitted for moderation';
    return res.status(201).json({
      success: true,
      message: message,
      event: newEvent
    });
  } catch (err) {
    console.error('Error creating event:', err);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * GET /api/events/:id
 * Get event by ID (including todos)
 */
router.get('/:id', (req, res) => {
  const eventId = req.params.id;
  const event = getEventWithTodos(eventId);

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  return res.json(event);
});

/**
 * PATCH /api/events/:id
 * Authenticated - edit own pending event
 * Body: { title, date_start, date_end, todos }
 */
router.patch('/:id', requireAuth, (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.userId;
  const { title, date_start, date_end, todos } = req.body;

  // Get event
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // Check ownership (only owner can edit, and only if pending)
  if (event.created_by_user_id !== userId) {
    return res.status(403).json({ error: 'You can only edit your own events' });
  }

  if (event.status !== 'pending') {
    return res.status(400).json({ error: 'Can only edit pending events' });
  }

  // Validate
  if (title && title.trim().length === 0) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }

  const finalStartDate = date_start || event.date_start;
  const finalEndDate = date_end || event.date_end;

  // Validate start date is not in the past
  const today = new Date().toISOString().split('T')[0];
  if (finalStartDate < today) {
    return res.status(400).json({ error: 'Start date cannot be in the past' });
  }

  // Validate end date is not before start date
  if (finalEndDate < finalStartDate) {
    return res.status(400).json({ error: 'End date cannot be earlier than start date' });
  }

  try {
    // Update event
    db.prepare(`
      UPDATE events
      SET title = ?, date_start = ?, date_end = ?
      WHERE id = ?
    `).run(
      title || event.title,
      finalStartDate,
      finalEndDate,
      eventId
    );

    // If todos provided, replace them
    if (Array.isArray(todos)) {
      db.prepare('DELETE FROM event_todos WHERE event_id = ?').run(eventId);
      todos.forEach(todo => {
        if (todo.trim && todo.trim().length > 0) {
          db.prepare('INSERT INTO event_todos (event_id, todo_text) VALUES (?, ?)')
            .run(eventId, todo.trim());
        }
      });
    }

    const updated = getEventWithTodos(eventId);
    return res.json({ success: true, event: updated });
  } catch (err) {
    console.error('Error updating event:', err);
    return res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * DELETE /api/events/:id
 * Authenticated - delete own pending event
 */
router.delete('/:id', requireAuth, (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.userId;

  // Get event
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // Check ownership
  if (event.created_by_user_id !== userId) {
    return res.status(403).json({ error: 'You can only delete your own events' });
  }

  try {
    db.prepare('DELETE FROM event_todos WHERE event_id = ?').run(eventId);
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    return res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    console.error('Error deleting event:', err);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
