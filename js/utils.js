/* =========================================================
   utils.js — small reusable helpers used across the app
   ========================================================= */

const Utils = {
  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },

  toISO(date) {
    return date.toISOString().slice(0, 10);
  },

  uid(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  },

  daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  formatDateLong(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  },

  monthName(month) {
    return ['January','February','March','April','May','June','July','August','September','October','November','December'][month];
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  },

  /* ---- streak + completion math (shared by dashboard/stats) ---- */

  habitCompletionRate(habit, sinceDays = 30) {
    let done = 0;
    for (let i = 0; i < sinceDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (habit.completions[Utils.toISO(d)]) done++;
    }
    return Math.round((done / sinceDays) * 100);
  },

  currentStreak(habit) {
    let streak = 0;
    let d = new Date();
    // if today isn't done yet, streak counts consecutive completed days ending yesterday
    if (!habit.completions[Utils.toISO(d)]) {
      d.setDate(d.getDate() - 1);
    }
    while (habit.completions[Utils.toISO(d)]) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  },

  longestStreak(habit) {
    const dates = Object.keys(habit.completions).filter(k => habit.completions[k]).sort();
    if (!dates.length) return 0;
    let longest = 1, run = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const cur = new Date(dates[i]);
      const diff = (cur - prev) / 86400000;
      if (diff === 1) { run++; longest = Math.max(longest, run); }
      else if (diff > 1) { run = 1; }
    }
    return longest;
  },

  overallCompletionToday(habits) {
    if (!habits.length) return 0;
    const t = Utils.todayISO();
    const done = habits.filter(h => h.completions[t]).length;
    return Math.round((done / habits.length) * 100);
  },

  overallCompletionRange(habits, days) {
    if (!habits.length) return 0;
    let total = 0, done = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = Utils.toISO(d);
      habits.forEach(h => {
        total++;
        if (h.completions[iso]) done++;
      });
    }
    return total ? Math.round((done / total) * 100) : 0;
  },

  missedDays(habits, days = 30) {
    let missed = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = Utils.toISO(d);
      const allDone = habits.length > 0 && habits.every(h => h.completions[iso]);
      const anyExisted = d <= new Date();
      if (anyExisted && !allDone) missed++;
    }
    return missed;
  },

  bestWorstHabit(habits) {
    if (!habits.length) return { best: null, worst: null };
    const rated = habits.map(h => ({ h, rate: Utils.habitCompletionRate(h, 30) }));
    rated.sort((a, b) => b.rate - a.rate);
    return { best: rated[0], worst: rated[rated.length - 1] };
  },

  /* ---- UI feedback ---- */

  toast(message, type = 'default') {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2600);
  },

  confetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#4F46E5', '#22C55E', '#F59E0B', '#EF4444', '#818CF8'];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      r: 4 + Math.random() * 6,
      c: colors[Math.floor(Math.random() * colors.length)],
      speed: 2 + Math.random() * 4,
      drift: -2 + Math.random() * 4,
      rot: Math.random() * 360,
      rotSpeed: -6 + Math.random() * 12
    }));
    let frame = 0;
    const maxFrames = 130;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.y += p.speed;
        p.x += p.drift;
        p.rot += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
      }
    }
    draw();
  },

  ripple(e) {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const rect = btn.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - diameter / 2}px`;
    circle.style.top = `${e.clientY - rect.top - diameter / 2}px`;
    circle.className = 'ripple';
    const old = btn.querySelector('.ripple');
    if (old) old.remove();
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  },

  downloadCSV(filename, rows) {
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
