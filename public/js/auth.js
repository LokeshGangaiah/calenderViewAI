/**
 * Authentication Logic
 * Handles login, register, and session management
 */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check if we're on auth page or app page
  if (document.getElementById('loginForm')) {
    setupAuthPage();
  } else {
    await setupAppPage();
  }
});

/**
 * Setup authentication page (login/register)
 */
function setupAuthPage() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const forms = document.querySelectorAll('.auth-form');

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      // Update active tab
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active form
      forms.forEach(f => f.classList.remove('active-tab'));
      document.getElementById(`${tab}Form`).classList.add('active-tab');
    });
  });

  // Login form
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // Register form
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

/**
 * Setup application page (calendar/moderation)
 */
async function setupAppPage() {
  // Check if user is authenticated
  try {
    currentUser = await API.auth.me();
    updateUserDisplay();

    // Check if on moderation page and user is not moderator
    if (window.location.pathname === '/moderation' && !currentUser.isModerator) {
      window.location.href = '/';
      return;
    }
  } catch (err) {
    // Not authenticated - redirect to login
    window.location.href = '/login';
    return;
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Show/hide moderation link for moderators
  const modBtn = document.getElementById('modBtn');
  if (modBtn && currentUser.isModerator) {
    modBtn.style.display = 'inline-block';
  }

  // Initialize moderation page if on it
  if (window.location.pathname === '/moderation') {
    initModeration();
  }
}

/**
 * Update user display in navbar
 */
function updateUserDisplay() {
  const userDisplay = document.getElementById('userDisplay');
  if (userDisplay && currentUser) {
    const role = currentUser.isModerator ? ' (Moderator)' : '';
    userDisplay.textContent = `👤 ${currentUser.username}${role}`;
  }
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  const successDiv = document.getElementById('loginSuccess');

  errorDiv.classList.remove('show');
  successDiv.classList.remove('show');

  if (!username || !password) {
    showError('Please fill in all fields', errorDiv);
    return;
  }

  try {
    const result = await API.auth.login(username, password);
    showSuccess('Login successful! Redirecting...', successDiv);

    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  } catch (err) {
    showError(err.message || 'Login failed', errorDiv);
  }
}

/**
 * Handle register form submission
 */
async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const errorDiv = document.getElementById('regError');
  const successDiv = document.getElementById('regSuccess');

  errorDiv.classList.remove('show');
  successDiv.classList.remove('show');

  if (!username || !password) {
    showError('Please fill in all fields', errorDiv);
    return;
  }

  if (username.length < 3) {
    showError('Username must be at least 3 characters', errorDiv);
    return;
  }

  if (password.length < 4) {
    showError('Password must be at least 4 characters', errorDiv);
    return;
  }

  try {
    await API.auth.register(username, password);
    showSuccess('Account created! Redirecting to calendar...', successDiv);

    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  } catch (err) {
    showError(err.message || 'Registration failed', errorDiv);
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    await API.auth.logout();
    window.location.href = '/login';
  } catch (err) {
    console.error('Logout error:', err);
    // Force redirect anyway
    window.location.href = '/login';
  }
}

/**
 * Show error in element
 */
function showError(message, element) {
  element.textContent = message;
  element.classList.add('show');
}

/**
 * Show success in element
 */
function showSuccess(message, element) {
  element.textContent = message;
  element.classList.add('show');
}

/**
 * Initialize moderation page
 */
async function initModeration() {
  if (window.location.pathname !== '/moderation') return;

  await loadPendingEvents();
}

/**
 * Load pending events for moderation
 */
async function loadPendingEvents() {
  try {
    const pending = await API.moderation.pending();
    displayPendingEvents(pending);
  } catch (err) {
    console.error('Error loading pending events:', err);
  }
}

/**
 * Display pending events
 */
function displayPendingEvents(events) {
  const pendingList = document.getElementById('pendingList');
  const noEvents = document.getElementById('noEvents');

  if (events.length === 0) {
    noEvents.style.display = 'block';
    pendingList.style.display = 'none';
    return;
  }

  noEvents.style.display = 'none';
  pendingList.style.display = 'block';
  pendingList.innerHTML = '';

  events.forEach(evt => {
    const item = document.createElement('div');
    item.classList.add('pending-item');

    const startDateStr = new Date(evt.date_start).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const endDateStr = evt.date_end ? new Date(evt.date_end).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) : startDateStr;

    const dateRangeStr = evt.date_end && evt.date_end !== evt.date_start
      ? `${startDateStr} to ${endDateStr}`
      : startDateStr;

    let html = `
      <div class="pending-item-header">
        <div>
          <div class="pending-item-title">${escapeHtml(evt.title)}</div>
          <div class="pending-item-meta">
            <span>By ${escapeHtml(evt.creator_username)}</span>
            <span> • ${dateRangeStr}</span>
          </div>
        </div>
      </div>
    `;

    if (evt.todos && evt.todos.length > 0) {
      html += `
        <div style="margin: 1rem 0; font-size: 0.9rem;">
          <strong>To-Do Items:</strong>
          <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
            ${evt.todos.map(todo => `<li>${escapeHtml(todo.todo_text)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    html += `
      <div class="pending-item-actions">
        <button class="btn btn-primary approve-btn" data-id="${evt.id}">✓ Approve</button>
        <button class="btn btn-danger reject-btn" data-id="${evt.id}">✕ Reject</button>
      </div>
    `;

    item.innerHTML = html;

    // Add event listeners
    item.querySelector('.approve-btn').addEventListener('click', () => approveEvent(evt.id));
    item.querySelector('.reject-btn').addEventListener('click', () => rejectEvent(evt.id));

    pendingList.appendChild(item);
  });
}

/**
 * Approve event
 */
async function approveEvent(eventId) {
  if (!confirm('Approve this event?')) return;

  try {
    await API.moderation.approve(eventId);
    showStatusMessage('Event approved!');
    await loadPendingEvents();
  } catch (err) {
    alert('Error approving event: ' + err.message);
  }
}

/**
 * Reject event
 */
async function rejectEvent(eventId) {
  if (!confirm('Reject and delete this event?')) return;

  try {
    await API.moderation.reject(eventId);
    showStatusMessage('Event rejected!');
    await loadPendingEvents();
  } catch (err) {
    alert('Error rejecting event: ' + err.message);
  }
}

/**
 * Show temporary status message
 */
function showStatusMessage(message) {
  const div = document.createElement('div');
  div.className = 'success-message show';
  div.style.position = 'fixed';
  div.style.top = '80px';
  div.style.right = '20px';
  div.style.zIndex = '9999';
  div.textContent = message;
  document.body.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 2000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
