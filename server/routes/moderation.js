const express = require('express');
const { db, getPendingEvents } = require('../db');
const { requireModerator } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/moderation/pending
 * Moderator only - get list of pending event suggestions
 */
router.get('/pending', requireModerator, (req, res) => {
  const pending = getPendingEvents();

  // Add todos to each event
  const withTodos = pending.map(evt => ({
    ...evt,
    todos: db.prepare('SELECT id, todo_text, completed FROM event_todos WHERE event_id = ?')
      .all(evt.id)
  }));

  return res.json(withTodos);
});

/**
 * PATCH /api/moderation/approve/:id
 * Moderator only - approve an event (change status to 'approved')
 */
router.patch('/approve/:id', requireModerator, (req, res) => {
  const eventId = req.params.id;

  // Get event
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (event.status !== 'pending') {
    return res.status(400).json({ error: `Event is not pending (current: ${event.status})` });
  }

  try {
    db.prepare('UPDATE events SET status = ? WHERE id = ?')
      .run('approved', eventId);

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    const todos = db.prepare('SELECT id, todo_text, completed FROM event_todos WHERE event_id = ?')
      .all(eventId);

    return res.json({
      success: true,
      message: 'Event approved',
      event: { ...updated, todos }
    });
  } catch (err) {
    console.error('Error approving event:', err);
    return res.status(500).json({ error: 'Failed to approve event' });
  }
});

/**
 * PATCH /api/moderation/reject/:id
 * Moderator only - reject an event (delete it)
 */
router.patch('/reject/:id', requireModerator, (req, res) => {
  const eventId = req.params.id;

  // Get event
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (event.status !== 'pending') {
    return res.status(400).json({ error: `Event is not pending (current: ${event.status})` });
  }

  try {
    db.prepare('DELETE FROM event_todos WHERE event_id = ?').run(eventId);
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);

    return res.json({
      success: true,
      message: 'Event rejected and deleted'
    });
  } catch (err) {
    console.error('Error rejecting event:', err);
    return res.status(500).json({ error: 'Failed to reject event' });
  }
});

module.exports = router;
