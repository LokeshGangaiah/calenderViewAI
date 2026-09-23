/**
 * Moderation Routes - FIXED VERSION
 * All endpoints now return JSON (never HTML) and have proper error handling
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireModerator } = require('../middleware/auth');

/**
 * GET /api/moderation/pending
 * Get all pending event suggestions
 */
router.get('/pending', requireModerator, (req, res) => {
  try {
    const events = db.prepare(`
      SELECT e.*, u.username as creator_username
      FROM events e
      LEFT JOIN users u ON e.created_by_user_id = u.id
      WHERE e.status = 'pending'
      ORDER BY e.created_at DESC
    `).all();

    // Enrich with todos for each event
    const enriched = events.map(evt => {
      const todos = db.prepare(`
        SELECT id, todo_text, completed
        FROM event_todos
        WHERE event_id = ?
      `).all(evt.id);

      return {
        ...evt,
        todos
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching pending events:', err);
    res.status(500).json({ error: 'Failed to fetch pending events', details: err.message });
  }
});

/**
 * PATCH /api/moderation/approve/:id
 * Approve a pending event
 */
router.patch('/approve/:id', requireModerator, (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);

    // Validate event exists and is pending
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only approve pending events',
        current_status: event.status
      });
    }

    // Update status to approved
    const updateStmt = db.prepare('UPDATE events SET status = ? WHERE id = ?');
    updateStmt.run('approved', eventId);

    // Fetch updated event with todos
    const updatedEvent = db.prepare(`
      SELECT e.*, u.username as creator_username
      FROM events e
      LEFT JOIN users u ON e.created_by_user_id = u.id
      WHERE e.id = ?
    `).get(eventId);

    const todos = db.prepare(`
      SELECT id, todo_text, completed
      FROM event_todos
      WHERE event_id = ?
    `).all(eventId);

    res.json({
      success: true,
      message: 'Event approved',
      event: {
        ...updatedEvent,
        todos
      }
    });
  } catch (err) {
    console.error('Error approving event:', err);
    res.status(500).json({ error: 'Failed to approve event', details: err.message });
  }
});

/**
 * PATCH /api/moderation/reject/:id
 * Reject a pending event (delete it)
 */
router.patch('/reject/:id', requireModerator, (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);

    // Validate event exists and is pending
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only reject pending events',
        current_status: event.status
      });
    }

    // Delete todos first (cascade delete)
    db.prepare('DELETE FROM event_todos WHERE event_id = ?').run(eventId);

    // Delete event
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);

    res.json({
      success: true,
      message: 'Event rejected and deleted'
    });
  } catch (err) {
    console.error('Error rejecting event:', err);
    res.status(500).json({ error: 'Failed to reject event', details: err.message });
  }
});

module.exports = router;
