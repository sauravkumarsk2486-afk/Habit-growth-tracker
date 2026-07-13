/* =========================================================
   app.js — app shell: state, navigation, theme, and the
   Dashboard / Goals / Notes / Settings / Profile pages
   ========================================================= */

const App = {
  state: null,

  init() {
    this.state = Storage.load();
    this.applyTheme(this.state.settings.theme);
    this.applyAccent(this.state.settings.accent);

    this.bindNav();
    this.bindGlobalUI();
    this.bindRipples();

    HabitPage.init();
    CalendarPage.init();
    Goals.init();
    Notes.init();
    Settings.init();
    Profile.init();

    this.navigate('dashboard');
  },

  persist() {
    Storage.save(this.state);
  },

  bindRipples() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .chip, .nav-link');
      if (btn) Utils.ripple.call(null, { currentTarget: btn, clientX: e.clientX, clientY: e.clientY });
    });
  },

  bindNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => this.navigate(link.dataset.page));
    });
    document.querySelectorAll('[data-goto]').forEach(el => {
      el.addEventListener('click', () => this.navigate(el.dataset.goto));
    });
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });
  },

  navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) {
      target.classList.add('active');
      target.classList.remove('fade-in');
      void target.offsetWidth; // restart animation
      target.classList.add('fade-in');
    }
    document.querySelectorAll(`.nav-link[data-page="${page}"]`).forEach(l => l.classList.add('active'));
    document.querySelector('.sidebar').classList.remove('open');

    if (page === 'dashboard') Dashboard.render();
    if (page === 'habits') HabitPage.render();
    if (page === 'calendar') CalendarPage.render();
    if (page === 'stats') { Stats.render(); Charts.renderAll(); }
    if (page === 'goals') Goals.render();
    if (page === 'notes') Notes.render();
    if (page === 'settings') Settings.render();
    if (page === 'profile') Profile.render();
  },

  bindGlobalUI() {
    document.getElementById('dateBadge').textContent = Utils.formatDateLong(new Date());
    document.getElementById('themeToggle').addEventListener('click', () => {
      const next = this.state.settings.theme === 'dark' ? 'light' : 'dark';
      this.state.settings.theme = next;
      this.applyTheme(next);
      this.persist();
    });

    document.getElementById('notifBell').addEventListener('click', () => {
      const panel = document.getElementById('notifPanel');
      panel.classList.toggle('open');
      this.renderNotifications();
    });
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('notifPanel');
      if (!panel.contains(e.target) && e.target.id !== 'notifBell' && !e.target.closest('#notifBell')) {
        panel.classList.remove('open');
      }
    });
  },

  renderNotifications() {
    const panel = document.getElementById('notifPanel');
    const habits = this.state.habits;
    const todayISO = Utils.todayISO();
    const pending = habits.filter(h => !h.completions[todayISO]);
    const items = [];
    if (pending.length) {
      items.push(`<div class="notif-item"><b>${pending.length}</b> habit${pending.length > 1 ? 's' : ''} left for today</div>`);
    } else if (habits.length) {
      items.push(`<div class="notif-item">🎉 All habits complete today!</div>`);
    }
    habits.forEach(h => {
      const streak = Utils.currentStreak(h);
      if (streak >= 3) items.push(`<div class="notif-item">🔥 ${h.icon} ${h.name} — ${streak} day streak</div>`);
    });
    panel.innerHTML = items.length ? items.join('') : '<div class="notif-item">No new notifications.</div>';
  },

  applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  },

  applyAccent(hex) {
    document.documentElement.style.setProperty('--primary', hex);
  }
};

/* ============================= DASHBOARD ============================= */

const Dashboard = {
  render() {
    const habits = App.state.habits;
    document.getElementById('greetingText').textContent = `${Utils.greeting()}, ${App.state.profile.name || 'there'} 👋`;
    document.getElementById('greetingSub').textContent = habits.length
      ? `You have ${habits.length} habit${habits.length > 1 ? 's' : ''} tracked. Keep the streak alive.`
      : `Add your first habit to get started.`;

    const todayPct = Utils.overallCompletionToday(habits);
    document.getElementById('dashTodayPct').textContent = todayPct + '%';
    document.getElementById('dashTodayRing').style.setProperty('--pct', todayPct);

    document.getElementById('dashWeekPct').textContent = Utils.overallCompletionRange(habits, 7) + '%';
    document.getElementById('dashMonthPct').textContent = Utils.overallCompletionRange(habits, 30) + '%';

    const longest = habits.reduce((m, h) => Math.max(m, Utils.longestStreak(h)), 0);
    const current = habits.reduce((m, h) => Math.max(m, Utils.currentStreak(h)), 0);
    document.getElementById('dashLongest').textContent = longest;
    document.getElementById('dashCurrent').textContent = current;

    // today's checklist quick view
    const todayISO = Utils.todayISO();
    const list = document.getElementById('dashTodayList');
    if (!habits.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-emoji">✨</div><p>No habits yet — head to the Habits tab to add your first one.</p></div>`;
    } else {
      list.innerHTML = habits.slice().sort((a,b)=>a.order-b.order).map(h => {
        const done = !!h.completions[todayISO];
        return `<div class="quick-habit ${done ? 'done' : ''}" data-quick="${h.id}">
          <span class="quick-check">${done ? '✓' : ''}</span>
          <span class="quick-icon">${h.icon}</span>
          <span class="quick-name">${h.name}</span>
          <span class="quick-streak">🔥 ${Utils.currentStreak(h)}</span>
        </div>`;
      }).join('');
      list.querySelectorAll('.quick-habit').forEach(el => {
        el.addEventListener('click', () => {
          const habit = habits.find(h => h.id === el.dataset.quick);
          if (habit.completions[todayISO]) delete habit.completions[todayISO];
          else habit.completions[todayISO] = true;
          App.persist();
          Dashboard.render();
          HabitPage.render();
          if (Utils.overallCompletionToday(habits) === 100) Utils.confetti();
        });
      });
    }

    // motivational quote (rotates by day so it's stable within a day)
    const quotes = [
      'Small daily improvements lead to staggering long-term results.',
      'Discipline is choosing between what you want now and what you want most.',
      'You do not rise to the level of your goals; you fall to the level of your systems.',
      'The secret of getting ahead is getting started.',
      'Motivation gets you going, habit keeps you going.',
      'Every action you take is a vote for the type of person you wish to become.'
    ];
    const idx = new Date().getDate() % quotes.length;
    document.getElementById('dashQuote').textContent = `"${quotes[idx]}"`;

    // upcoming goals preview
    const goalsList = document.getElementById('dashGoalsPreview');
    const activeGoals = App.state.goals.filter(g => g.status !== 'completed').slice(0, 3);
    goalsList.innerHTML = activeGoals.length
      ? activeGoals.map(g => `<div class="mini-goal">
          <div class="mini-goal-top"><span>${g.title}</span><span class="badge badge-${g.priority}">${g.priority}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${g.progress}%"></div></div>
        </div>`).join('')
      : `<p class="muted">No active goals. Set one on the Goals page.</p>`;
  }
};

/* ============================= STATS ============================= */

const Stats = {
  render() {
    const habits = App.state.habits;
    document.getElementById('statTotalHabits').textContent = habits.length;
    const todayISO = Utils.todayISO();
    document.getElementById('statCompletedToday').textContent = habits.filter(h => h.completions[todayISO]).length;
    document.getElementById('statFailedToday').textContent = habits.length - habits.filter(h => h.completions[todayISO]).length;
    document.getElementById('statAvgPct').textContent = Utils.overallCompletionRange(habits, 30) + '%';
    document.getElementById('statWeeklyReport').textContent = Utils.overallCompletionRange(habits, 7) + '%';
    document.getElementById('statMonthlyReport').textContent = Utils.overallCompletionRange(habits, 30) + '%';
    document.getElementById('statYearlyReport').textContent = Utils.overallCompletionRange(habits, 365) + '%';

    document.getElementById('exportCSVBtn').onclick = () => this.exportCSV();
    document.getElementById('exportPDFBtn').onclick = () => window.print();
  },

  exportCSV() {
    const habits = App.state.habits;
    const days = 30;
    const header = ['Habit', ...Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); return Utils.toISO(d);
    })];
    const rows = [header];
    habits.forEach(h => {
      const row = [h.name];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        row.push(h.completions[Utils.toISO(d)] ? 'Done' : '');
      }
      rows.push(row);
    });
    Utils.downloadCSV(`habit-growth-report-${Utils.todayISO()}.csv`, rows);
    Utils.toast('CSV exported ⬇️', 'success');
  }
};

/* ============================= GOALS ============================= */

const Goals = {
  init() {
    document.getElementById('addGoalBtn').addEventListener('click', () => this.openForm());
    document.getElementById('goalFormCancel').addEventListener('click', () => this.closeForm());
    document.getElementById('goalForm').addEventListener('submit', (e) => this.save(e));
  },

  openForm() {
    document.getElementById('goalFormOverlay').classList.add('open');
  },
  closeForm() {
    document.getElementById('goalFormOverlay').classList.remove('open');
    document.getElementById('goalForm').reset();
  },

  save(e) {
    e.preventDefault();
    const f = e.target;
    App.state.goals.push({
      id: Utils.uid('g'),
      title: f.goalTitle.value.trim(),
      type: f.goalType.value,
      deadline: f.goalDeadline.value,
      priority: f.goalPriority.value,
      progress: Number(f.goalProgress.value) || 0,
      status: 'active'
    });
    App.persist();
    this.closeForm();
    this.render();
    Dashboard.render();
    Utils.toast('Goal added 🎯', 'success');
  },

  updateProgress(id, val) {
    const g = App.state.goals.find(g => g.id === id);
    if (!g) return;
    g.progress = Number(val);
    if (g.progress >= 100) { g.status = 'completed'; g.progress = 100; }
    else g.status = 'active';
    App.persist();
    this.render();
  },

  remove(id) {
    App.state.goals = App.state.goals.filter(g => g.id !== id);
    App.persist();
    this.render();
  },

  render() {
    const wrap = document.getElementById('goalsList');
    const goals = App.state.goals;
    if (!goals.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-emoji">🎯</div><p>No goals yet. Add a long-term or short-term goal to stay focused.</p></div>`;
      return;
    }
    wrap.innerHTML = goals.map(g => `
      <div class="goal-card">
        <div class="goal-top">
          <div>
            <span class="badge badge-outline">${g.type === 'long' ? 'Long-term' : 'Short-term'}</span>
            <h4>${g.title}</h4>
          </div>
          <button class="icon-btn" data-remove-goal="${g.id}">✕</button>
        </div>
        <div class="goal-meta">
          <span>📅 ${g.deadline || 'No deadline'}</span>
          <span class="badge badge-${g.priority}">${g.priority}</span>
          <span class="badge ${g.status === 'completed' ? 'badge-success' : 'badge-muted'}">${g.status}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${g.progress}%"></div></div>
        <input type="range" min="0" max="100" value="${g.progress}" class="goal-range" data-goal-range="${g.id}">
      </div>
    `).join('');

    wrap.querySelectorAll('[data-goal-range]').forEach(input => {
      input.addEventListener('input', () => this.updateProgress(input.dataset.goalRange, input.value));
    });
    wrap.querySelectorAll('[data-remove-goal]').forEach(btn => {
      btn.addEventListener('click', () => this.remove(btn.dataset.removeGoal));
    });
  }
};

/* ============================= NOTES ============================= */

const Notes = {
  searchTerm: '',

  init() {
    document.getElementById('addNoteBtn').addEventListener('click', () => this.openForm());
    document.getElementById('noteFormCancel').addEventListener('click', () => this.closeForm());
    document.getElementById('noteForm').addEventListener('submit', (e) => this.save(e));
    document.getElementById('noteSearch').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.render();
    });
  },

  openForm() { document.getElementById('noteFormOverlay').classList.add('open'); },
  closeForm() {
    document.getElementById('noteFormOverlay').classList.remove('open');
    document.getElementById('noteForm').reset();
  },

  save(e) {
    e.preventDefault();
    const f = e.target;
    const checklistRaw = f.noteChecklist.value.trim();
    const checklist = checklistRaw ? checklistRaw.split(',').map(t => ({ text: t.trim(), done: false })) : [];
    App.state.notes.unshift({
      id: Utils.uid('n'),
      title: f.noteTitle.value.trim() || 'Untitled',
      content: f.noteContent.value.trim(),
      pinned: false,
      checklist,
      createdAt: new Date().toISOString()
    });
    App.persist();
    this.closeForm();
    this.render();
    Utils.toast('Note saved 📝', 'success');
  },

  togglePin(id) {
    const n = App.state.notes.find(n => n.id === id);
    if (n) n.pinned = !n.pinned;
    App.persist();
    this.render();
  },

  toggleCheck(noteId, idx) {
    const n = App.state.notes.find(n => n.id === noteId);
    if (n) n.checklist[idx].done = !n.checklist[idx].done;
    App.persist();
    this.render();
  },

  remove(id) {
    App.state.notes = App.state.notes.filter(n => n.id !== id);
    App.persist();
    this.render();
  },

  render() {
    const wrap = document.getElementById('notesList');
    let notes = App.state.notes.filter(n =>
      n.title.toLowerCase().includes(this.searchTerm) || n.content.toLowerCase().includes(this.searchTerm)
    );
    notes = notes.slice().sort((a, b) => (b.pinned - a.pinned) || (new Date(b.createdAt) - new Date(a.createdAt)));

    if (!notes.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-emoji">🗒️</div><p>No notes found.</p></div>`;
      return;
    }

    wrap.innerHTML = notes.map(n => `
      <div class="note-card ${n.pinned ? 'pinned' : ''}">
        <div class="note-top">
          <h4>${n.title}</h4>
          <div class="note-actions">
            <button class="icon-btn" data-pin="${n.id}" title="Pin">${n.pinned ? '📌' : '📍'}</button>
            <button class="icon-btn" data-remove-note="${n.id}" title="Delete">✕</button>
          </div>
        </div>
        <p class="note-content">${n.content}</p>
        ${n.checklist && n.checklist.length ? `<div class="note-checklist">
          ${n.checklist.map((c, idx) => `<label class="checklist-item">
            <input type="checkbox" data-note-check="${n.id}:${idx}" ${c.done ? 'checked' : ''}>
            <span class="${c.done ? 'strike' : ''}">${c.text}</span>
          </label>`).join('')}
        </div>` : ''}
        <span class="note-date">${new Date(n.createdAt).toLocaleDateString()}</span>
      </div>
    `).join('');

    wrap.querySelectorAll('[data-pin]').forEach(btn => btn.addEventListener('click', () => this.togglePin(btn.dataset.pin)));
    wrap.querySelectorAll('[data-remove-note]').forEach(btn => btn.addEventListener('click', () => this.remove(btn.dataset.removeNote)));
    wrap.querySelectorAll('[data-note-check]').forEach(cb => {
      cb.addEventListener('change', () => {
        const [noteId, idx] = cb.dataset.noteCheck.split(':');
        this.toggleCheck(noteId, Number(idx));
      });
    });
  }
};

/* ============================= PROFILE ============================= */

const Profile = {
  init() {
    document.getElementById('profileForm').addEventListener('submit', (e) => this.save(e));
    document.getElementById('profilePhotoInput').addEventListener('change', (e) => this.loadPhoto(e));
  },

  loadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      App.state.profile.photo = reader.result;
      App.persist();
      this.render();
      this.renderAvatar();
    };
    reader.readAsDataURL(file);
  },

  save(e) {
    e.preventDefault();
    const f = e.target;
    App.state.profile.name = f.profileName.value.trim() || 'Alex';
    App.state.profile.dailyTarget = Number(f.profileDaily.value) || 0;
    App.state.profile.weeklyGoal = Number(f.profileWeekly.value) || 0;
    App.state.profile.monthlyGoal = Number(f.profileMonthly.value) || 0;
    App.persist();
    this.renderAvatar();
    Dashboard.render();
    Utils.toast('Profile updated 👤', 'success');
  },

  renderAvatar() {
    const photo = App.state.profile.photo;
    const initials = (App.state.profile.name || 'A').slice(0, 1).toUpperCase();
    document.querySelectorAll('.profile-avatar').forEach(el => {
      el.innerHTML = photo ? `<img src="${photo}" alt="profile">` : initials;
    });
  },

  render() {
    const p = App.state.profile;
    document.getElementById('profileName').value = p.name;
    document.getElementById('profileDaily').value = p.dailyTarget;
    document.getElementById('profileWeekly').value = p.weeklyGoal;
    document.getElementById('profileMonthly').value = p.monthlyGoal;
    document.getElementById('profilePreview').innerHTML = p.photo
      ? `<img src="${p.photo}" alt="profile">`
      : (p.name || 'A').slice(0, 1).toUpperCase();
    this.renderAvatar();
  }
};

/* ============================= SETTINGS ============================= */

const Settings = {
  init() {
    document.querySelectorAll('.accent-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        App.state.settings.accent = sw.dataset.accent;
        App.applyAccent(sw.dataset.accent);
        App.persist();
        this.render();
      });
    });
    document.getElementById('themeSelect').addEventListener('change', (e) => {
      App.state.settings.theme = e.target.value;
      App.applyTheme(e.target.value);
      App.persist();
    });
    document.getElementById('notifToggle').addEventListener('change', (e) => {
      App.state.settings.notifications = e.target.checked;
      App.persist();
    });
    document.getElementById('resetDataBtn').addEventListener('click', () => {
      if (confirm('This will erase all habits, goals, and notes. Continue?')) {
        App.state = Storage.reset();
        App.applyTheme(App.state.settings.theme);
        App.applyAccent(App.state.settings.accent);
        App.navigate('dashboard');
        Utils.toast('Data reset', 'warning');
      }
    });
    document.getElementById('backupBtn').addEventListener('click', () => {
      Storage.exportJSON(App.state);
      Utils.toast('Backup downloaded ⬇️', 'success');
    });
    document.getElementById('restoreInput').addEventListener('change', (e) => this.restore(e));
  },

  restore(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        App.state = parsed;
        Storage.save(parsed);
        App.applyTheme(parsed.settings.theme);
        App.applyAccent(parsed.settings.accent);
        App.navigate('dashboard');
        Utils.toast('Backup restored ✅', 'success');
      } catch (err) {
        Utils.toast('Invalid backup file', 'danger');
      }
    };
    reader.readAsText(file);
  },

  render() {
    document.getElementById('themeSelect').value = App.state.settings.theme;
    document.getElementById('notifToggle').checked = App.state.settings.notifications;
    document.querySelectorAll('.accent-swatch').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.accent === App.state.settings.accent);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
