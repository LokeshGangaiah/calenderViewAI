/**
 * API wrapper for backend calls
 * Handles authentication redirect on 401
 */

const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (response.status === 401) {
      // Unauthenticated - redirect to login
      window.location.href = '/login';
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  },

  // Auth endpoints
  auth: {
    register(username, password) {
      return API.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
    },

    login(username, password) {
      return API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
    },

    logout() {
      return API.request('/auth/logout', { method: 'POST' });
    },

    me() {
      return API.request('/auth/me');
    }
  },

  // Event endpoints
  events: {
    list() {
      return API.request('/events');
    },

    create(title, date_start, date_end, todos) {
      return API.request('/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          date_start,
          date_end,
          todos: todos || []
        })
      });
    },

    get(id) {
      return API.request(`/events/${id}`);
    },

    update(id, title, date_start, date_end, todos) {
      return API.request(`/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          date_start,
          date_end,
          todos
        })
      });
    },

    delete(id) {
      return API.request(`/events/${id}`, { method: 'DELETE' });
    }
  },

  // Moderation endpoints
  moderation: {
    pending() {
      return API.request('/moderation/pending');
    },

    approve(id) {
      return API.request(`/moderation/approve/${id}`, { method: 'PATCH' });
    },

    reject(id) {
      return API.request(`/moderation/reject/${id}`, { method: 'PATCH' });
    }
  }
};
