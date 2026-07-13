/* =========================================================
   habit.js — Habit Tracker page: monthly grid, toggling,
   drag & drop reordering, search + category filter
   ========================================================= */

const HabitPage = {
  viewDate: new Date(), // month currently displayed in the tracker
  searchTerm: '',
  activeCategory: 'All',
  draggedId: null,

  init() {
    document.getElementById('habitPrevMonth').addEventListener('click', () => this.shiftMonth(-1));
    document.getElementById('habitNextMonth').addEventListener('click', () => this.shiftMonth(1));
    document.getElementById('habitSearch').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.render();
    });
    document.getElementById('addHabitBtn').addEventListener('click', () => this.promptAddHabit());
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('habitSearch').focus();
      }
    });
  },

  shiftMonth(delta) {
    this.viewDate.setMonth(this.viewDate.getMonth() + delta);
    this.render();
  },

  promptAddHabit() {
    const name = prompt('Habit name (add an emoji if you like, e.g. "🏃 Morning Run"):');
    if (!name) return;
    const parts = name.trim().split(' ');
    let icon = '✅';
    let cleanName = name.trim();
    if (/\p{Emoji}/u.test(parts[0]) && parts.length > 1) {
      icon = parts[0];
      cleanName = parts.slice(1).join(' ');
    }
    const category = prompt('Category (Health, Work, Mind, Morning, Growth, Custom):', 'Custom') || 'Custom';
    App.state.habits.push({
      id: Utils.uid('h'),
      name: cleanName,
      icon,
      category,
      order: App.state.habits.length,
      createdAt: new Date().toISOString(),
      completions: {}
    });
    App.persist();
    this.render();
    Dashboard.render();
    Utils.toast('Habit added ✅', 'success');
  },

  deleteHabit(id) {
    if (!confirm('Delete this habit? This cannot be undone.')) return;
    App.state.habits = App.state.habits.filter(h => h.id !== id);
    App.persist();
    this.render();
    Dashboard.render();
  },

  toggle(habitId, dateISO, cellEl) {
    const habit = App.state.habits.find(h => h.id === habitId);
    if (!habit) return;
    if (habit.completions[dateISO]) {
      delete habit.completions[dateISO];
      cellEl.classList.remove('checked');
    } else {
      habit.completions[dateISO] = true;
      cellEl.classList.add('checked');
      cellEl.classList.add('pop');
      setTimeout(() => cellEl.classList.remove('pop'), 350);
    }
    App.persist();

    // live progress bar + stat refresh without full re-render (feels instant)
    this.updateProgressBits();
    Dashboard.render();

    if (dateISO === Utils.todayISO()) {
      const pct = Utils.overallCompletionToday(App.state.habits);
      if (pct === 100) Utils.confetti();
    }
  },

  categories() {
    const set = new Set(App.state.habits.map(h => h.category || 'Custom'));
    return ['All', ...Array.from(set)];
  },

  filteredHabits() {
    return App.state.habits
      .slice()
      .sort((a, b) => a.order - b.order)
      .filter(h => h.name.toLowerCase().includes(this.searchTerm))
      .filter(h => this.activeCategory === 'All' || h.category === this.activeCategory);
  },

  updateProgressBits() {
    const habits = App.state.habits;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setW = (id, val) => { const el = document.getElementById(id); if (el) el.style.width = val + '%'; };

    const todayPct = Utils.overallCompletionToday(habits);
    const weekPct = Utils.overallCompletionRange(habits, 7);
    const monthPct = Utils.overallCompletionRange(habits, 30);
    const { best, worst } = Utils.bestWorstHabit(habits);
    const longest = habits.reduce((m, h) => Math.max(m, Utils.longestStreak(h)), 0);
    const current = habits.reduce((m, h) => Math.max(m, Utils.currentStreak(h)), 0);
    const missed = Utils.missedDays(habits, 30);

    set('statOverall', Utils.overallCompletionRange(habits, 30) + '%');
    set('statToday', todayPct + '%');
    set('statWeek', weekPct + '%');
    set('statMonth', monthPct + '%');
    set('statLongestStreak', longest);
    set('statCurrentStreak', current);
    set('statMissed', missed);
    set('statBest', best ? `${best.h.icon} ${best.h.name}` : '—');
    set('statWorst', worst ? `${worst.h.icon} ${worst.h.name}` : '—');
    setW('todayProgressBar', todayPct);
  },

  render() {
    const container = document.getElementById('habitGridWrap');
    if (!container) return;

    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const numDays = Utils.daysInMonth(year, month);
    const habits = this.filteredHabits();

    document.getElementById('habitMonthLabel').textContent = `${Utils.monthName(month)} ${year}`;

    // category chips
    const chipsWrap = document.getElementById('categoryChips');
    chipsWrap.innerHTML = this.categories().map(c =>
      `<button class="chip ${c === this.activeCategory ? 'active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    chipsWrap.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeCategory = chip.dataset.cat;
        this.render();
      });
    });

    if (!habits.length) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-emoji">🌱</div>
        <p>No habits match. Try a different search or add a new habit.</p>
      </div>`;
      this.updateProgressBits();
      return;
    }

    const todayISO = Utils.todayISO();
    const isCurrentMonth = (new Date()).getFullYear() === year && (new Date()).getMonth() === month;

    let html = '<table class="habit-table"><thead><tr><th class="sticky-col">Habit</th>';
    for (let d = 1; d <= numDays; d++) {
      const dateObj = new Date(year, month, d);
      const isToday = isCurrentMonth && d === (new Date()).getDate();
      const dow = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });
      html += `<th class="${isToday ? 'today-col' : ''}"><span class="dow">${dow}</span><span class="dnum">${d}</span></th>`;
    }
    html += '<th class="pct-col">%</th></tr></thead><tbody>';

    habits.forEach(h => {
      html += `<tr draggable="true" data-id="${h.id}" class="habit-row">
        <td class="sticky-col habit-name-cell">
          <span class="drag-handle">⠿</span>
          <span class="habit-icon">${h.icon}</span>
          <span class="habit-name">${h.name}</span>
          <button class="row-delete" data-del="${h.id}" title="Delete habit">✕</button>
        </td>`;
      for (let d = 1; d <= numDays; d++) {
        const dateObj = new Date(year, month, d);
        const iso = Utils.toISO(dateObj);
        const checked = !!h.completions[iso];
        const isFuture = dateObj > new Date();
        html += `<td class="check-cell ${checked ? 'checked' : ''} ${isFuture ? 'future' : ''}" data-habit="${h.id}" data-date="${iso}">
          <span class="check-box">${checked ? '✓' : ''}</span>
        </td>`;
      }
      const rate = Utils.habitCompletionRate(h, numDays);
      html += `<td class="pct-col-cell">${rate}%</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    // bind cell clicks
    container.querySelectorAll('.check-cell:not(.future)').forEach(cell => {
      cell.addEventListener('click', () => {
        this.toggle(cell.dataset.habit, cell.dataset.date, cell);
      });
    });

    // bind delete
    container.querySelectorAll('.row-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteHabit(btn.dataset.del);
      });
    });

    // drag & drop reorder
    container.querySelectorAll('.habit-row').forEach(row => {
      row.addEventListener('dragstart', () => { this.draggedId = row.dataset.id; row.classList.add('dragging'); });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => e.preventDefault());
      row.addEventListener('drop', () => {
        if (!this.draggedId || this.draggedId === row.dataset.id) return;
        const ids = App.state.habits.slice().sort((a, b) => a.order - b.order).map(h => h.id);
        const from = ids.indexOf(this.draggedId);
        const to = ids.indexOf(row.dataset.id);
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        ids.forEach((id, idx) => {
          const h = App.state.habits.find(x => x.id === id);
          if (h) h.order = idx;
        });
        App.persist();
        this.render();
      });
    });

    this.updateProgressBits();
  }
};
