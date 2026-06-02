'use strict';

function destroyStatsCharts () {
  for (const c of state.statsCharts) {
    try { c.destroy(); } catch { /* ignore */ }
  }
  state.statsCharts = [];
}

function standingsTableHtml (rows) {
  const medals = ['🥇', '🥈', '🥉'];
  return rows.map((u, i) => `
    <div class="flex items-center gap-3 bg-surface border border-border ${i === 0 ? 'rank-1' : ''} rounded-xl px-4 py-3 mb-2">
      <span class="text-base w-6 text-center">${medals[i] ?? `<span class="text-muted text-sm">${i + 1}</span>`}</span>
      <span class="flex-1 text-sm flex items-center gap-2">
        <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style="background:${u.color || '#3b82f6'}22; border:1px solid ${u.color || '#3b82f6'}">
          ${u.avatar || '⚽'}
        </span>
        <span class="${u.pseudo === state.user?.pseudo ? 'text-white font-semibold' : 'text-slate-300'}">
          ${escHtml(u.pseudo)}
        </span>
      </span>
      <span class="text-blue-400 font-bold text-sm">${u.total_points} pts</span>
      <span class="text-xs text-muted ml-1">
        <span class="text-green-400">${u.exact_scores}✓</span>
        <span class="text-purple-400 ml-1">${u.good_results}↗</span>
        ${u.bonus_winner ? '<span class="text-amber-400 ml-1" title="Vainqueur">🏆</span>' : ''}
        ${u.bonus_scorer ? '<span class="text-yellow-400" title="Meilleur buteur">⚽</span>' : ''}
      </span>
    </div>`).join('');
}

function renderStatsCharts (stats) {
  if (typeof Chart === 'undefined') return;

  destroyStatsCharts();
  const commonOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', boxWidth: 12, font: { size: 10 } },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxRotation: 45, font: { size: 9 } },
        grid: { color: '#1e2535' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: '#1e2535' },
      },
    },
  };

  const ptsCtx = document.getElementById('chart-points');
  if (ptsCtx && stats.points_series?.length) {
    state.statsCharts.push(new Chart(ptsCtx, {
      type: 'line',
      data: {
        labels: stats.labels,
        datasets: stats.points_series.map(s => ({
          label: s.pseudo,
          data: s.points,
          borderColor: s.color,
          backgroundColor: `${s.color}33`,
          tension: 0.25,
          pointRadius: 2,
          borderWidth: 2,
        })),
      },
      options: {
        ...commonOpts,
        plugins: { ...commonOpts.plugins, title: { display: false } },
        scales: {
          ...commonOpts.scales,
          y: { ...commonOpts.scales.y, beginAtZero: true, title: { display: true, text: 'Points', color: '#64748b' } },
        },
      },
    }));
  }

  const rankCtx = document.getElementById('chart-ranks');
  if (rankCtx && stats.points_series?.length) {
    const maxRank = stats.players.length || 1;
    state.statsCharts.push(new Chart(rankCtx, {
      type: 'line',
      data: {
        labels: stats.labels,
        datasets: stats.points_series.map(s => ({
          label: s.pseudo,
          data: s.ranks,
          borderColor: s.color,
          backgroundColor: `${s.color}22`,
          tension: 0.25,
          pointRadius: 2,
          borderWidth: 2,
        })),
      },
      options: {
        ...commonOpts,
        scales: {
          ...commonOpts.scales,
          y: {
            ...commonOpts.scales.y,
            reverse: true,
            min: 1,
            max: maxRank,
            ticks: { stepSize: 1, color: '#64748b' },
            title: { display: true, text: 'Rang', color: '#64748b' },
          },
        },
      },
    }));
  }

  const distCtx = document.getElementById('chart-distribution');
  if (distCtx) {
    const d = stats.distribution;
    state.statsCharts.push(new Chart(distCtx, {
      type: 'doughnut',
      data: {
        labels: ['Scores exacts (3 pts)', 'Bons résultats (1 pt)', 'Ratés (0 pt)'],
        datasets: [{
          data: [d.exact_scores, d.good_results, d.wrong],
          backgroundColor: ['#22c55e', '#a855f7', '#475569'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } },
        },
      },
    }));
  }

  const barCtx = document.getElementById('chart-bars');
  if (barCtx && stats.players?.length) {
    state.statsCharts.push(new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: stats.players.map(p => p.pseudo),
        datasets: [
          {
            label: 'Points matchs',
            data: stats.players.map(p => p.match_points),
            backgroundColor: stats.players.map(p => `${p.color}99`),
            borderColor: stats.players.map(p => p.color),
            borderWidth: 1,
          },
          {
            label: 'Bonus',
            data: stats.players.map(p => p.total_points - p.match_points),
            backgroundColor: '#f59e0b88',
            borderColor: '#f59e0b',
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonOpts,
        scales: {
          x: { ...commonOpts.scales.x, stacked: true },
          y: { ...commonOpts.scales.y, stacked: true, beginAtZero: true },
        },
        plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
      },
    }));
  }
}

function statsPanelHtml (stats) {
  const playerCards = (stats.players || []).map(p => `
    <div class="stat-card">
      <div class="flex items-center gap-2 mb-2">
        <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style="background:${p.color}22;border:1px solid ${p.color}">${p.avatar}</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-white truncate">${escHtml(p.pseudo)}</p>
          <p class="text-[10px] text-muted">#${p.current_rank} · ${p.total_points} pts</p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><p class="text-green-400 font-bold">${p.exact_scores}</p><p class="text-muted">Exact</p></div>
        <div><p class="text-purple-400 font-bold">${p.good_results}</p><p class="text-muted">Bon</p></div>
        <div><p class="text-slate-500 font-bold">${p.wrong}</p><p class="text-muted">Raté</p></div>
      </div>
      <p class="text-[10px] text-muted mt-2 text-center">
        Précision ${p.accuracy_pct}% · Moy. ${p.avg_points} pt/match
      </p>
    </div>`).join('');

  return `
    <p class="text-xs text-slate-400 mb-4">
      ${stats.finished_matches} match(s) terminé(s)${stats.has_bonus ? ' · bonus inclus' : ''}
    </p>

    <div class="bg-surface border border-border rounded-xl p-3 mb-4">
      <p class="text-xs font-semibold text-slate-300 mb-2">Évolution des points</p>
      <div class="chart-wrap tall"><canvas id="chart-points"></canvas></div>
    </div>

    <div class="bg-surface border border-border rounded-xl p-3 mb-4">
      <p class="text-xs font-semibold text-slate-300 mb-2">Évolution du classement</p>
      <p class="text-[10px] text-muted mb-2">1 = 1er · axe inversé (monter = mieux classé)</p>
      <div class="chart-wrap tall"><canvas id="chart-ranks"></canvas></div>
    </div>

    <div class="grid grid-cols-1 gap-4 mb-4">
      <div class="bg-surface border border-border rounded-xl p-3">
        <p class="text-xs font-semibold text-slate-300 mb-2">Répartition des pronos (groupe)</p>
        <div class="chart-wrap"><canvas id="chart-distribution"></canvas></div>
      </div>
      <div class="bg-surface border border-border rounded-xl p-3">
        <p class="text-xs font-semibold text-slate-300 mb-2">Points par joueur</p>
        <div class="chart-wrap"><canvas id="chart-bars"></canvas></div>
      </div>
    </div>

    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Fiche joueur</p>
    <div class="grid grid-cols-2 gap-2 mb-4">${playerCards || '<p class="text-muted text-xs col-span-2">Aucune donnée.</p>'}</div>`;
}

async function renderStandings () {
  const el = document.getElementById('view-standings');
  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;

  let stats;
  try {
    const [standingsResult, statsResult] = await Promise.all([
      API.getStandings(),
      API.getAdvancedStats(),
    ]);
    state.standings = Array.isArray(standingsResult) ? standingsResult : [];
    stats = statsResult;
  } catch (e) {
    el.innerHTML = `<p class="text-red-400 text-sm">${escHtml(e.message)}</p>`;
    return;
  }

  const tab = state.standingsTab || 'table';
  const rows = standingsTableHtml(state.standings);

  el.innerHTML = `
    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Classement</p>
    <p class="text-xs text-slate-400 mb-3">${escHtml(state.currentPool?.name || 'Groupe')}</p>

    <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
      <button type="button" class="stats-tab ${tab === 'table' ? 'active' : ''}" data-standings-tab="table">📋 Tableau</button>
      <button type="button" class="stats-tab ${tab === 'stats' ? 'active' : ''}" data-standings-tab="stats">📊 Statistiques</button>
    </div>

    <div id="standings-panel-table" class="${tab === 'table' ? '' : 'hidden'}">
      ${rows || '<p class="text-muted text-sm text-center py-8">Aucun joueur.</p>'}
      <div class="mt-4 bg-surface border border-border rounded-xl p-3">
        <p class="text-xs text-muted mb-2">Légende</p>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <span><span class="text-green-400">✓</span> Score exact (3 pts)</span>
          <span><span class="text-purple-400">↗</span> Bon résultat (1 pt)</span>
          <span><span class="text-amber-400">🏆</span> Vainqueur (5 pts)</span>
          <span><span class="text-yellow-400">⚽</span> Meilleur buteur (3 pts)</span>
        </div>
      </div>
    </div>

    <div id="standings-panel-stats" class="${tab === 'stats' ? '' : 'hidden'}">
      ${statsPanelHtml(stats)}
    </div>`;

  el.querySelectorAll('[data-standings-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.standingsTab = btn.dataset.standingsTab;
      renderStandings();
    });
  });

  if (tab === 'stats') {
    requestAnimationFrame(() => renderStatsCharts(stats));
  } else {
    destroyStatsCharts();
  }
}
