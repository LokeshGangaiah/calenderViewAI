/**
 * Calendar View Logic
 * Renders calendar grid and manages event display
 */

let currentDate = new Date(2026, 8, 1); // Start with September 2026
let allEvents = [];
let selectedTodos = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();
  renderCalendar();
  setupEventListeners();
});

/**
 * Load approved events from backend
 */
async function loadEvents() {
  try {
    allEvents = await API.events.list();
  } catch (err) {
    console.error('Error loading events:', err);
    showError('Failed to load events');
  }
}

/**
 * Render the calendar grid for current month
 */
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Update month display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('monthDisplay').textContent =
    `${monthNames[month]} ${year}`;

  // Clear calendar body
  const calendarBody = document.getElementById('calendarBody');
  calendarBody.innerHTML = '';

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let date = 1;
  let nextMonthDate = 1;

  // Create 6 rows (weeks)
  for (let week = 0; week < 6; week++) {
    const row = document.createElement('tr');

    // 7 columns (days)
    for (let day = 0; day < 7; day++) {
      const cell = document.createElement('td');
      let cellDate = null;
      let cellText = '';

      if (week === 0 && day < firstDay) {
        // Previous month's days
        cellDate = new Date(year, month, -(firstDay - day - 1));
        cellText = daysInPrevMonth - firstDay + day + 1;
        cell.classList.add('other-month');
      } else if (date <= daysInMonth) {
        // Current month's days
        cellDate = new Date(year, month, date);
        cellText = date;

        // Highlight today
        const today = new Date();
        if (today.getDate() === date &&
            today.getMonth() === month &&
            today.getFullYear() === year) {
          cell.classList.add('today');
        }

        date++;
      } else {
        // Next month's days
        cellDate = new Date(year, month + 1, nextMonthDate);
        cellText = nextMonthDate;
        cell.classList.add('other-month');
        nextMonthDate++;
      }

      // Add date number
      const dateDiv = document.createElement('div');
      dateDiv.textContent = cellText;
      dateDiv.style.fontWeight = 'bold';
      dateDiv.style.marginBottom = '0.25rem';
      cell.appendChild(dateDiv);

      // Add events for this date
      if (cellDate) {
        const dateStr = formatDate(cellDate);
        const dayEvents = allEvents.filter(evt =>
          evt.date_start === dateStr ||
          (evt.date_end && dateStr >= evt.date_start && dateStr <= evt.date_end)
        );

        dayEvents.slice(0, 2).forEach(evt => {
          const badge = document.createElement('div');
          badge.classList.add('event-badge');
          badge.textContent = evt.title;
          badge.style.cursor = 'pointer';
          badge.addEventListener('click', (e) => {
            e.stopPropagation();
            showEventModal(evt);
          });
          cell.appendChild(badge);
        });

        if (dayEvents.length > 2) {
          const more = document.createElement('div');
          more.style.fontSize = '0.75rem';
          more.style.color = 'var(--secondary)';
          more.textContent = `+${dayEvents.length - 2} more`;
          cell.appendChild(more);
        }
      }

      // Click to view day events
      cell.addEventListener('click', () => {
        if (cellDate) {
          showDayEvents(cellDate);
        }
      });

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
  }

  // Update upcoming events sidebar
  updateEventsSidebar();
}

/**
 * Update the upcoming events sidebar
 */
function updateEventsSidebar() {
  const eventsList = document.getElementById('eventsList');
  eventsList.innerHTML = '';

  // Sort events by date
  const sorted = [...allEvents].sort((a, b) =>
    new Date(a.date_start) - new Date(b.date_start)
  );

  if (sorted.length === 0) {
    eventsList.innerHTML = '<p style="color: var(--secondary); text-align: center;">No upcoming events</p>';
    return;
  }

  sorted.forEach(evt => {
    const item = document.createElement('div');
    item.classList.add('event-item');

    const title = document.createElement('div');
    title.classList.add('event-item-title');
    title.textContent = evt.title;

    const date = document.createElement('div');
    date.classList.add('event-item-date');
    date.textContent = formatDateDisplay(new Date(evt.date_start));

    item.appendChild(title);
    item.appendChild(date);

    item.addEventListener('click', () => showEventModal(evt));
    eventsList.appendChild(item);
  });
}

/**
 * Show event detail modal
 */
function showEventModal(evt) {
  const modal = document.getElementById('eventModal');
  document.getElementById('modalTitle').textContent = evt.title;

  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div>
      <p><strong>Date:</strong> ${formatDateDisplay(new Date(evt.date_start))}</p>
      ${evt.date_end && evt.date_end !== evt.date_start ?
        `<p><strong>End Date:</strong> ${formatDateDisplay(new Date(evt.date_end))}</p>` : ''}
      ${evt.creator_username ? `<p><strong>Created by:</strong> ${evt.creator_username}</p>` : ''}
      ${evt.todos && evt.todos.length > 0 ? `
        <div>
          <strong>To-Do Items:</strong>
          <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
            ${evt.todos.map(todo => `<li>${todo.todo_text}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;

  modal.classList.add('show');
}

/**
 * Show day's events
 */
function showDayEvents(date) {
  const dateStr = formatDate(date);
  const dayEvents = allEvents.filter(evt =>
    evt.date_start === dateStr ||
    (evt.date_end && dateStr >= evt.date_start && dateStr <= evt.date_end)
  );

  const modal = document.getElementById('eventModal');
  document.getElementById('modalTitle').textContent =
    `Events on ${formatDateDisplay(date)}`;

  const body = document.getElementById('modalBody');
  if (dayEvents.length === 0) {
    body.innerHTML = '<p>No events on this day</p>';
  } else {
    body.innerHTML = dayEvents.map(evt => `
      <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
        <h3 style="margin-bottom: 0.5rem;">${evt.title}</h3>
        ${evt.creator_username ? `<p style="font-size: 0.9rem; color: var(--secondary);">By ${evt.creator_username}</p>` : ''}
        ${evt.todos && evt.todos.length > 0 ? `
          <ul style="margin-top: 0.5rem; padding-left: 1.5rem; font-size: 0.9rem;">
            ${evt.todos.map(todo => `<li>${todo.todo_text}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('');
  }

  modal.classList.add('show');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Month navigation
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Modal close
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
    });
  });

  // Close modal when clicking outside
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });

  // Suggest Event button
  document.getElementById('suggestBtn').addEventListener('click', () => {
    document.getElementById('suggestModal').classList.add('show');
  });

  // Close suggest modal
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
    });
  });

  // Suggest form
  document.getElementById('suggestForm').addEventListener('submit', submitEvent);

  // Add todo button
  document.getElementById('addTodoBtn').addEventListener('click', addTodo);

  // Set today's date as default and minimum
  const today = new Date();
  const todayStr = formatDate(today);
  document.getElementById('eventDateStart').value = todayStr;
  document.getElementById('eventDateStart').min = todayStr;
  document.getElementById('eventDateEnd').min = todayStr;

  // Update end date min when start date changes
  document.getElementById('eventDateStart').addEventListener('change', (e) => {
    const startDate = e.target.value;
    const endDateInput = document.getElementById('eventDateEnd');
    if (startDate) {
      endDateInput.min = startDate;
      // If end date is before new start date, update it
      if (endDateInput.value < startDate) {
        endDateInput.value = startDate;
      }
    }
  });

  // Update submit button text based on user role
  updateSubmitButtonText();
}

/**
 * Add todo to the form
 */
function addTodo() {
  const input = document.getElementById('todoInput');
  const todoText = input.value.trim();

  if (!todoText) {
    showError('Please enter a to-do item', 'suggestError');
    return;
  }

  selectedTodos.push(todoText);
  input.value = '';

  renderTodoList();
}

/**
 * Render todo list in form
 */
function renderTodoList() {
  const list = document.getElementById('todoList');
  list.innerHTML = selectedTodos.map((todo, idx) => `
    <li class="todo-item">
      <span>${todo}</span>
      <button type="button" class="todo-remove" onclick="removeTodo(${idx})">×</button>
    </li>
  `).join('');
}

/**
 * Remove todo from list
 */
function removeTodo(idx) {
  selectedTodos.splice(idx, 1);
  renderTodoList();
}

/**
 * Submit new event
 */
async function submitEvent(e) {
  e.preventDefault();

  const title = document.getElementById('eventTitle').value.trim();
  const dateStart = document.getElementById('eventDateStart').value;
  const dateEnd = document.getElementById('eventDateEnd').value;

  if (!title || !dateStart || !dateEnd) {
    showError('Please fill in all required fields', 'suggestError');
    return;
  }

  // Validate start date is not in the past
  const today = new Date();
  const todayStr = formatDate(today);
  if (dateStart < todayStr) {
    showError('Start date cannot be in the past', 'suggestError');
    return;
  }

  // Validate end date is not before start date
  if (dateEnd < dateStart) {
    showError('End date cannot be earlier than start date', 'suggestError');
    return;
  }

  try {
    await API.events.create(title, dateStart, dateEnd, selectedTodos);

    // Reset form
    document.getElementById('suggestForm').reset();
    selectedTodos = [];
    renderTodoList();

    // Update button text after successful submission
    await updateSubmitButtonText();

    showSuccess('Event submitted! A moderator will review it soon.', 'suggestSuccess');

    // Close modal after 2 seconds
    setTimeout(() => {
      document.getElementById('suggestModal').classList.remove('show');
      clearMessages();
      // Reload events to reflect any auto-approved admin events
      loadEvents();
    }, 2000);
  } catch (err) {
    showError(err.message, 'suggestError');
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display
 */
function formatDateDisplay(date) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Show error message
 */
function showError(message, elementId = 'error') {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.classList.add('show');
  }
}

/**
 * Show success message
 */
function showSuccess(message, elementId = 'success') {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.classList.add('show');
  }
}

/**
 * Clear all messages
 */
function clearMessages() {
  document.querySelectorAll('.error-message, .success-message').forEach(el => {
    el.classList.remove('show');
  });
}

/**
 * Update submit button text based on user role
 */
async function updateSubmitButtonText() {
  try {
    const user = await API.auth.me();
    const submitBtn = document.getElementById('submitEventBtn');
    if (submitBtn) {
      if (user.isModerator) {
        submitBtn.textContent = 'Submit Event';
      } else {
        submitBtn.textContent = 'Submit for Approval';
      }
    }
  } catch (err) {
    console.error('Error checking user role:', err);
  }
}
