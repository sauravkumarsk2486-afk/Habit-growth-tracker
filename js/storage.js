/* =========================================================
   storage.js — single source of truth for all persisted data
   Everything lives in one localStorage key so backup/restore
   is a single JSON blob.
   ========================================================= */

const STORAGE_KEY = 'habitGrowth.v1';

const DEFAULT_HABITS = [
  { name: 'Wake Up at 5AM',      icon: '⏰', category: 'Morning' },
  { name: 'Workout',             icon: '💪', category: 'Health' },
  { name: 'Read 30 Minutes',     icon: '📖', category: 'Growth' },
  { name: 'Drink 3L Water',      icon: '💧', category: 'Health' },
  { name: 'Meditation',          icon: '🧘', category: 'Mind' },
  { name: 'Coding',              icon: '💻', category: 'Work' },
  { name: 'DSA Practice',        icon: '🧠', category: 'Work' },
  { name: 'Journal',             icon: '📓', category: 'Mind' },
  { name: 'No Sugar',            icon: '🚫', category: 'Health' },
  { name: 'No Social Media',     icon: '📵', category: 'Mind' },
  { name: 'Sleep Before 11 PM',  icon: '🌙', category: 'Morning' },
];

function seedDefaultState() {
  const today = new Date();
  const habits = DEFAULT_HABITS.map((h, i) => ({
    id: 'h_' + i + '_' + Date.now(),
    name: h.name,
    icon: h.icon,
    category: h.category,
    order: i,
    createdAt: today.toISOString(),
    completions: {} // { 'YYYY-MM-DD': true }
  }));

  return {
    habits,
    goals: [
      { id: 'g_1', title: 'Finish 100 Days of Code', type: 'long', deadline: addDaysISO(100), priority: 'high', progress: 20, status: 'active' },
      { id: 'g_2', title: 'Read 4 books this month', type: 'short', deadline: addDaysISO(20), priority: 'medium', progress: 45, status: 'active' },
    ],
    notes: [
      { id: 'n_1', title: 'Welcome 👋', content: 'This is your notes space. Pin important thoughts, jot checklists, and keep track of ideas.', pinned: true, checklist: [], createdAt: today.toISOString() }
    ],
    calendarNotes: {}, // { 'YYYY-MM-DD': 'note text' }
    profile: {
      name: 'Alex',
      photo: '',
      dailyTarget: 8,
      weeklyGoal: 50,
      monthlyGoal: 80
    },
    settings: {
      theme: 'light',
      accent: '#4F46E5',
      notifications: true
    }
  };
}

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = seedDefaultState();
        this.save(seeded);
        return seeded;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Storage load failed, reseeding', e);
      const seeded = seedDefaultState();
      this.save(seeded);
      return seeded;
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Storage save failed', e);
      return false;
    }
  },
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return this.load();
  },
  exportJSON(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-growth-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
