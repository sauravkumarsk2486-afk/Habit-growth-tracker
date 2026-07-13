/* =========================================================
   calendar.js — Calendar page: month grid, day detail modal
   ========================================================= */

const CalendarPage = {
  viewDate: new Date(),
  selectedISO: null,

  init() {
    document.getElementById('calPrevMonth').addEventListener('click', () => this.shift(-1));
    document.getElementById('calNextMonth').addEventListener('click', () => this.shift(1));
    document.getElementById('dayModalClose').addEventListener('click', () => this.closeModal());
    document.getElementById('dayModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'dayModalOverlay') this.closeModal();
    });
    document.getElementById('dayNoteSave').addEventListener('click', () => this.saveNote());
  },

  shift(delta) {
    this.viewDate.setMonth(this.viewDate.getMonth() + delta);
    this.render();
  },

  openDay(iso) {
    this.selectedISO = iso;
    const modal = document.getElementById('dayModalOverlay');
    const habits = App.state.habits;
    const dateObj = new Date(iso + 'T00:00:00');

    document.getElementById('dayModalTitle').textContent = Utils.formatDateLong(dateObj);
    const list = document.getElementById('dayHabitList');
    if (!habits.length) {
      list.innerHTML = '<p class="muted">No habits yet.</p>';
    } else {
      list.innerHTML = habits.map(h => {
        const done = !!h.completions[iso];
        return `<div class="day-habit-item ${done ? 'done' : ''}">
          <span>${h.icon} ${h.name}</span>
          <span class="badge ${done ? 'badge-success' : 'badge-muted'}">${done ? 'Completed' : 'Missed'}</span>
        </div>`;
      }).join('');
    }
    document.getElementById('dayNoteInput').value = App.state.calendarNotes[iso] || '';
    modal.classList.add('open');
  },

  closeModal() {
    document.getElementById('dayModalOverlay').classList.remove('open');
  },

  saveNote() {
    const text = document.getElementById('dayNoteInput').value.trim();
    if (text) App.state.calendarNotes[this.selectedISO] = text;
    else delete App.state.calendarNotes[this.selectedISO];
    App.persist();
    Utils.toast('Day note saved 📝', 'success');
    this.closeModal();
  },

  render() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    document.getElementById('calMonthLabel').textContent = `${Utils.monthName(month)} ${year}`;

    const firstDow = new Date(year, month, 1).getDay();
    const numDays = Utils.daysInMonth(year, month);
    const todayISO = Utils.todayISO();
    const habits = App.state.habits;

    let html = ['S','M','T','W','T','F','S'].map(d => `<div class="cal-dow">${d}</div>`).join('');
    for (let i = 0; i < firstDow; i++) html += `<div class="cal-cell empty"></div>`;

    for (let d = 1; d <= numDays; d++) {
      const dateObj = new Date(year, month, d);
      const iso = Utils.toISO(dateObj);
      const total = habits.length || 1;
      const done = habits.filter(h => h.completions[iso]).length;
      const rate = habits.length ? done / total : 0;
      const hasNote = !!App.state.calendarNotes[iso];
      let dot = '';
      if (rate > 0) {
        let cls = 'low';
        if (rate >= 1) cls = 'full';
        else if (rate >= 0.5) cls = 'mid';
        dot = `<span class="cal-dot ${cls}"></span>`;
      }
      html += `<div class="cal-cell ${iso === todayISO ? 'is-today' : ''}" data-date="${iso}">
        <span class="cal-daynum">${d}</span>
        ${dot}
        ${hasNote ? '<span class="cal-note-flag">📝</span>' : ''}
      </div>`;
    }

    grid.innerHTML = html;
    grid.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => this.openDay(cell.dataset.date));
    });
  }
};
