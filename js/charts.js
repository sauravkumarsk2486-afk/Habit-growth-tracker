/* =========================================================
   charts.js — Chart.js visualizations + contribution heatmap
   ========================================================= */

const Charts = {
  trendChart: null,
  barChart: null,
  pieChart: null,

  colors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      primary: styles.getPropertyValue('--primary').trim(),
      success: styles.getPropertyValue('--success').trim(),
      warning: styles.getPropertyValue('--warning').trim(),
      danger: styles.getPropertyValue('--danger').trim(),
      text: styles.getPropertyValue('--text').trim(),
      grid: styles.getPropertyValue('--border').trim()
    };
  },

  renderAll() {
    this.renderTrend();
    this.renderBar();
    this.renderPie();
    this.renderHeatmap();
  },

  renderTrend() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    const c = this.colors();
    const habits = App.state.habits;
    const labels = [];
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      const iso = Utils.toISO(d);
      const done = habits.filter(h => h.completions[iso]).length;
      data.push(habits.length ? Math.round((done / habits.length) * 100) : 0);
    }
    if (this.trendChart) this.trendChart.destroy();
    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Completion %',
          data,
          borderColor: c.primary,
          backgroundColor: c.primary + '22',
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: c.primary
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { color: c.text, callback: v => v + '%' }, grid: { color: c.grid } },
          x: { ticks: { color: c.text }, grid: { display: false } }
        }
      }
    });
  },

  renderBar() {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;
    const c = this.colors();
    const habits = App.state.habits;
    const labels = habits.map(h => h.icon + ' ' + h.name);
    const data = habits.map(h => Utils.habitCompletionRate(h, 30));
    if (this.barChart) this.barChart.destroy();
    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '30-day completion %',
          data,
          backgroundColor: c.primary,
          borderRadius: 8,
          maxBarThickness: 28
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 100, ticks: { color: c.text, callback: v => v + '%' }, grid: { color: c.grid } },
          y: { ticks: { color: c.text }, grid: { display: false } }
        }
      }
    });
  },

  renderPie() {
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;
    const c = this.colors();
    const habits = App.state.habits;
    let completed = 0, missed = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = Utils.toISO(d);
      habits.forEach(h => { h.completions[iso] ? completed++ : missed++; });
    }
    if (this.pieChart) this.pieChart.destroy();
    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Missed'],
        datasets: [{ data: [completed, missed], backgroundColor: [c.success, c.danger], borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: c.text } } },
        cutout: '65%'
      }
    });
  },

  renderHeatmap() {
    const wrap = document.getElementById('heatmapWrap');
    if (!wrap) return;
    const habits = App.state.habits;
    const days = 119; // ~17 weeks, GitHub-style
    const cells = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = Utils.toISO(d);
      const total = habits.length || 1;
      const done = habits.filter(h => h.completions[iso]).length;
      const rate = done / total;
      let level = 0;
      if (rate > 0) level = 1;
      if (rate >= 0.34) level = 2;
      if (rate >= 0.67) level = 3;
      if (rate >= 1) level = 4;
      cells.push(`<div class="heat-cell level-${level}" title="${iso}: ${done}/${habits.length} habits"></div>`);
    }
    wrap.innerHTML = `<div class="heat-grid">${cells.join('')}</div>`;
  }
};
