/**
 * API Wrapper - FIXED VERSION
 * Critical fix: moderation.approve() and moderation.reject() now use PATCH (not POST)
 */

const API = {
  auth: {
    register(username, password) {
      return fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }).then(r => r.json());
    },

    login(username, password) {
      return fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }).then(r => r.json());
    },

    logout() {
      return fetch('/api/auth/logout', { method: 'POST' })
        .then(() => ({ success: true }))
        .catch(() => ({ success: true }));
    },

    me() {
      return fetch('/api/auth/me').then(r => {
        if (!r.ok) throw new Error('Not authenticated');
        return r.json();
      });
    }
  },

  events: {
    list() {
      return fetch('/api/events').then(r => r.json());
    },

    get(id) {
      return fetch(`/api/events/${id}`).then(r => {
        if (!r.ok) throw new Error('Event not found');
        return r.json();
      });
    },

    create(title, dateStart, dateEnd, todos = []) {
      return fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date_start: dateStart, date_end: dateEnd, todos })
      }).then(r => {
        if (!r.ok) throw new Error('Failed to create event');
        return r.json();
      }).then(data => {
        if (data.error) throw new Error(data.error);
        return data;
      });
    },

    update(id, title, dateStart, dateEnd, todos = []) {
      return fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date_start: dateStart, date_end: dateEnd, todos })
      }).then(r => {
        if (!r.ok) throw new Error('Failed to update event');
        return r.json();
      }).then(data => {
        if (data.error) throw new Error(data.error);
        return data;
      });
    },

    delete(id) {
      return fetch(`/api/events/${id}`, {
        method: 'DELETE'
      }).then(r => {
        if (!r.ok) throw new Error('Failed to delete event');
        return r.json();
      }).then(data => {
        if (data.error) throw new Error(data.error);
        return data;
      });
    }
  },

  moderation: {
    pending() {
      return fetch('/api/moderation/pending').then(r => {
        if (!r.ok) throw new Error('Failed to fetch pending events');
        return r.json();
      });
    },

    // FIX: Changed from POST to PATCH
    approve(id) {
      return fetch(`/api/moderation/approve/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      }).then(r => {
        if (!r.ok) return r.json().then(data => {
          throw new Error(data.error || 'Failed to approve event');
        });
        return r.json();
      });
    },

    // FIX: Changed from POST to PATCH
    reject(id) {
      return fetch(`/api/moderation/reject/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      }).then(r => {
        if (!r.ok) return r.json().then(data => {
          throw new Error(data.error || 'Failed to reject event');
        });
        return r.json();
      });
    }
  }
};
