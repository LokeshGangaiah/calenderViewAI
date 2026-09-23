/**
 * API Wrapper
 * Abstracts HTTP calls to backend
 */

const API = {
  events: {
    /**
     * List all approved events
     */
    list: async () => {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to load events');
      return res.json();
    },

    /**
     * Get single event by ID
     */
    get: async (id) => {
      const res = await fetch(`/api/events/${id}`);
      if (!res.ok) throw new Error('Event not found');
      return res.json();
    },

    /**
     * Create new event
     */
    create: async (title, dateStart, dateEnd, todos = []) => {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date_start: dateStart, date_end: dateEnd, todos })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create event');
      }
      return res.json();
    },

    /**
     * Update existing event
     */
    update: async (id, title, dateStart, dateEnd, todos = []) => {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date_start: dateStart, date_end: dateEnd, todos })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update event');
      }
      return res.json();
    },

    /**
     * Delete event
     */
    delete: async (id) => {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete event');
      }
      return res.json();
    }
  },

  auth: {
    /**
     * Get current authenticated user
     */
    me: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    },

    /**
     * Login
     */
    login: async (username, password) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }
      return res.json();
    },

    /**
     * Register
     */
    register: async (username, password) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }
      return res.json();
    },

    /**
     * Logout
     */
    logout: async () => {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Logout failed');
      return res.json();
    }
  },

  moderation: {
    /**
     * Get pending events for moderation
     */
    pending: async () => {
      const res = await fetch('/api/moderation/pending');
      if (!res.ok) throw new Error('Failed to load pending events');
      return res.json();
    },

    /**
     * Approve event
     */
    approve: async (id) => {
      const res = await fetch(`/api/moderation/approve/${id}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve event');
      }
      return res.json();
    },

    /**
     * Reject event
     */
    reject: async (id) => {
      const res = await fetch(`/api/moderation/reject/${id}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reject event');
      }
      return res.json();
    }
  }
};
