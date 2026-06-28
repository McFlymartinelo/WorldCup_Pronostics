'use strict';

async function renderMatches (silent = false) {
  const el = document.getElementById('view-matches');
  if (!silent) {
    el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;
  }
  try {
    state.matches = await API.getMatches();
  } catch (e) {
    if (!silent) el.innerHTML = `<p class="text-red-400 text-sm text-center py-8">${e.message}</p>`;
    return;
  }

  const hasLive = state.matches.some(m =>
    m.status === 'LIVE' || m.status === 'IN_PLAY' || m.status === 'PAUSED',
  );

  const days = {};
  const dayOrder = [];
  for (const m of state.matches) {
    const key = matchDayKey(m.match_date);
    if (!days[key]) {
      days[key] = [];
      dayOrder.push(key);
    }
    days[key].push(m);
  }
  dayOrder.sort();
  for (const key of dayOrder) {
    days[key].sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  }

  let html = '';
  if (hasLive) {
    html += `<p class="text-xs text-amber-400 mb-3 flex items-center gap-2"><span class="badge-live inline-block w-2 h-2 rounded-full"></span> Mode live — actualisation auto</p>`;
  }
  for (const dayKey of dayOrder) {
    const dayMatches = days[dayKey];
    html += `
      <div class="match-day-section" data-day="${dayKey}">
        <p class="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 mt-5 first:mt-0 flex items-center justify-between gap-2">
          <span class="capitalize">${escHtml(formatMatchDayLabel(dayKey))}</span>
          <span class="text-muted font-normal normal-case shrink-0">${dayMatches.length} match${dayMatches.length > 1 ? 's' : ''}</span>
        </p>`;
    for (const m of dayMatches) html += matchCard(m);
    html += `</div>`;
  }
  el.innerHTML = html || `<p class="text-muted text-sm text-center py-12">Aucun match trouvé.</p>`;
  startCountdownTicker();

  if (!silent) scrollToToday(el, dayOrder);

  el.querySelectorAll('.pred-form').forEach(form => {
    const mid = +form.dataset.matchId;
    const home = form.querySelector('.input-home');
    const away = form.querySelector('.input-away');

    async function save () {
      const h = parseInt(home.value, 10);
      const a = parseInt(away.value, 10);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
      try {
        await API.savePrediction(mid, h, a);
        toast('Pronostic enregistré', 'success');
      } catch (e) {
        toast(e.message, 'error');
      }
    }
    home.addEventListener('change', save);
    away.addEventListener('change', save);
  });

  el.querySelectorAll('.match-card-link').forEach(card => {
    card.addEventListener('click', () => {
      navigateTo('detail', { matchId: +card.dataset.matchId, returnView: 'matches' });
    });
  });

  if (hasLive && state.currentView === 'matches') {
    startLivePoll(async () => {
      if (state.currentView !== 'matches') { stopLivePoll(); return; }
      await renderMatches(true);
    }, 30000);
  } else if (state.currentView === 'matches') {
    stopLivePoll();
  }
}

function scrollToToday (el, dayOrder) {
  const todayKey = matchDayKey(new Date().toISOString());

  const targetKey = dayOrder.includes(todayKey)
    ? todayKey
    : dayOrder.find(k => k > todayKey) || null;

  if (!targetKey) return;

  const section = el.querySelector(`.match-day-section[data-day="${targetKey}"]`);
  if (!section) return;

  // Délai court pour laisser le navigateur finir le layout après l'injection HTML
  setTimeout(() => {
    const main = document.querySelector('main');
    if (!main) return;

    // Position de la section dans le contenu scrollable de main
    const mainRect = main.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const scrollTarget = main.scrollTop + (sectionRect.top - mainRect.top) - 12;

    main.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
  }, 80);
}

function matchDayKey (matchDate) {
  const d = new Date(matchDate);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function formatMatchDayLabel (dayKey) {
  const [y, mo, d] = dayKey.split('-').map(Number);
  const target = new Date(y, mo - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return 'Aujourd\'hui';
  if (diffDays === 1) return 'Demain';
  if (diffDays === -1) return 'Hier';
  return target.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function matchGroupLabel (m) {
  if (m.group_name) return `Groupe ${String(m.group_name).replace(/^GROUP_/i, '')}`;
  if (m.stage) return stageName(m.stage) || m.stage;
  return '';
}

function matchCard (m) {
  const isLocked = m.is_locked;

  const statusBadge = (() => {
    if (m.status === 'LIVE') return `<span class="badge badge-live text-xs px-2 py-0.5 rounded-full">⬤ En cours</span>`;
    if (m.status === 'FINISHED') return `<span class="badge badge-done text-xs px-2 py-0.5 rounded-full">Terminé</span>`;
    if (isLocked) return `<span class="badge badge-locked text-xs px-2 py-0.5 rounded-full">🔒 Fermé</span>`;
    return `<span class="badge badge-open text-xs px-2 py-0.5 rounded-full">● Ouvert</span>`;
  })();

  const timeStr = new Date(m.match_date).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });
  const groupLabel = matchGroupLabel(m);
  const groupBadge = groupLabel
    ? `<span class="text-[10px] text-slate-400 bg-border px-1.5 py-0.5 rounded">${escHtml(groupLabel)}</span>`
    : '';

  const realScore = (m.status === 'LIVE' || m.status === 'FINISHED') && m.home_score !== null
    ? `<div class="text-lg font-bold text-center ${m.status === 'LIVE' ? 'text-amber-400' : 'text-slate-200'}">
         ${m.home_score} – ${m.away_score}
       </div>
       <div class="text-xs text-muted text-center mt-0.5">Score réel</div>`
    : '';

  const myPred = m.user_prediction
    ? `<div class="text-xs text-center mt-1">
         Mon pronostic : <span class="font-semibold">${m.user_prediction.home}–${m.user_prediction.away}</span>
         ${m.user_prediction.points !== null
      ? `· <span class="${ptsCls(m.user_prediction.points)} px-1.5 py-0.5 rounded-full">${m.user_prediction.points} pt${m.user_prediction.points !== 1 ? 's' : ''}</span>`
      : ''}
       </div>`
    : '';

  const predForm = !isLocked
    ? `<div class="pred-form" data-match-id="${m.id}">
         <div class="flex items-center justify-center gap-2">
           <input class="score-input input-home" type="number" min="0" max="20"
                  value="${m.user_prediction?.home ?? ''}" placeholder="–">
           <span class="text-muted text-sm">–</span>
           <input class="score-input input-away" type="number" min="0" max="20"
                  value="${m.user_prediction?.away ?? ''}" placeholder="–">
         </div>
         <p class="pred-msg text-xs text-muted text-center mt-1">
           ${m.user_prediction ? '✓ Enregistré' : 'Entre ton pronostic'}
         </p>
       </div>`
    : realScore + myPred;

  return `
    <div class="bg-surface border border-border rounded-xl p-3 mb-3 transition"
     data-match-id="${m.id}">
    <div class="flex justify-between items-center mb-2 gap-2">
      <span class="text-xs text-muted flex items-center gap-2 min-w-0">
        <span class="font-medium text-slate-300">${timeStr}</span>
        ${groupBadge}
      </span>
      <div class="flex items-center gap-2">
        ${statusBadge}
        <button class="match-card-link text-xs text-muted hover:text-white border border-border hover:border-slate-500 px-2 py-0.5 rounded-lg transition"
                data-match-id="${m.id}">
          Détails →
        </button>
      </div>
    </div>
    <div class="flex items-center justify-between gap-2">
      <div class="flex-1 text-center">
        <span class="text-2xl block mb-1">${flagEmoji(m.home_team)}</span>
        <span class="text-xs font-medium text-slate-300">${shortName(m.home_team)}</span>
      </div>
      <div class="flex-shrink-0 min-w-[90px]">${predForm}</div>
      <div class="flex-1 text-center">
        <span class="text-2xl block mb-1">${flagEmoji(m.away_team)}</span>
        <span class="text-xs font-medium text-slate-300">${shortName(m.away_team)}</span>
      </div>
    </div>
    ${countdownHtml(m)}
  </div>`;
}

function countdownHtml (m) {
  if (m.is_locked || m.status === 'FINISHED' || m.status === 'LIVE') return '';
  const msLeft = new Date(m.match_date).getTime() - Date.now();
  const urgent = msLeft <= 3600000;
  return `
    <div class="match-countdown mt-2 pt-2 border-t border-border text-center text-[11px] ${urgent ? 'text-amber-400' : 'text-muted'}"
         data-kickoff="${m.match_date}">
      ⏳ Pronostic ouvert · ferme ${formatCountdown(msLeft)}
    </div>`;
}

function refreshCountdowns () {
  document.querySelectorAll('.match-countdown[data-kickoff]').forEach(elc => {
    const msLeft = new Date(elc.dataset.kickoff).getTime() - Date.now();
    const urgent = msLeft <= 3600000;
    elc.classList.toggle('text-amber-400', urgent);
    elc.classList.toggle('text-muted', !urgent);
    elc.textContent = `⏳ Pronostic ouvert · ferme ${formatCountdown(msLeft)}`;
  });
}

function startCountdownTicker () {
  if (state.countdownTimer) return;
  state.countdownTimer = setInterval(refreshCountdowns, 30000);
}

async function renderDetail (matchId) {
  const el = document.getElementById('view-detail');
  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;
  let data;
  try { data = await API.getMatch(matchId); }
  catch (e) { el.innerHTML = `<p class="text-red-400 text-sm">${e.message}</p>`; return; }

  const { match: m, is_locked, my_prediction, all_predictions, home_stats, away_stats } = data;
  const reactionEmojis = data.prediction_emojis || ['👍', '🔥', '😂', '🎯', '💪', '😱', '🤡', '🧊'];

  const formHtml = (stats) => {
    if (!stats?.form) return '<span class="text-muted text-xs">—</span>';
    return stats.form.split(' ').map(r =>
      `<span class="form-${r} w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">${r}</span>`,
    ).join('');
  };

  const [homeSummary, awaySummary, homeSquad, awaySquad, h2h] = await Promise.all([
    API.getTeamSummary(m.home_team).catch(() => null),
    API.getTeamSummary(m.away_team).catch(() => null),
    API.getSquad(m.home_team).catch(() => null),
    API.getSquad(m.away_team).catch(() => null),
    API.getH2H(m.home_team, m.away_team).catch(() => null),
  ]);

  const squadHtml = (squadData, teamName) => {
    const players = squadData?.squad || [];
    if (!players.length) return `
      <div class="bg-surface border border-border rounded-xl p-3 h-full">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          ${flagEmoji(teamName)} Sélection — ${shortName(teamName)}
        </p>
        <p class="text-xs text-muted italic">Effectif indisponible</p>
      </div>`;

    const byPos = {
      Gardiens: players.filter(p => ['GK'].includes(p.position)),
      Défenseurs: players.filter(p => ['DF', 'DEF', 'CB', 'LB', 'RB', 'WB'].includes(p.position)),
      Milieux: players.filter(p => ['MID', 'MF', 'CM', 'DM', 'AM'].includes(p.position)),
      Attaquants: players.filter(p => ['FW', 'ATT', 'ST', 'LW', 'RW', 'SS'].includes(p.position)),
      Autres: players.filter(p => !['GK', 'DF', 'DEF', 'CB', 'LB', 'RB', 'WB', 'MID', 'MF', 'CM', 'DM', 'AM', 'FW', 'ATT', 'ST', 'LW', 'RW', 'SS'].includes(p.position)),
    };

    const posEmoji = { Gardiens: '🧤', Défenseurs: '🛡️', Milieux: '⚙️', Attaquants: '⚡', Autres: '👤' };

    let html = `
      <div class="bg-surface border border-border rounded-xl p-3 h-full">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          ${flagEmoji(teamName)} Sélection — ${shortName(teamName)}
          <span class="font-normal">(${players.length} joueurs)</span>
        </p>`;

    for (const [pos, group] of Object.entries(byPos)) {
      if (!group.length) continue;
      html += `
        <p class="text-xs text-muted mt-3 mb-2 font-semibold">${posEmoji[pos]} ${pos}</p>
        <div class="space-y-1">
          ${group.map(p => `
            <div class="flex items-center gap-2 py-1 border-b border-border last:border-0">
              <span class="flex-1 text-xs text-slate-200">${p.name}</span>
              ${p.caps ? `<span class="text-xs text-blue-400 ml-1">${p.caps} sél.</span>` : ''}
            </div>`).join('')}
        </div>`;
    }

    html += `</div>`;
    return html;
  };

  const predsHtml = is_locked && all_predictions.length
    ? all_predictions.map((p, i) => `
        <div class="py-2 border-b border-border last:border-0">
          <div class="flex items-center gap-3">
            <span class="text-sm text-muted w-5 text-center">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
            <span class="flex-1 text-sm ${p.pseudo === state.user.pseudo ? 'text-white font-semibold' : 'text-slate-300'}">${escHtml(p.pseudo)}</span>
            <span class="text-sm font-semibold">${p.predicted_home} – ${p.predicted_away}</span>
            ${p.points !== null
        ? `<span class="${ptsCls(p.points)} text-xs px-2 py-0.5 rounded-full">${p.points} pt${p.points !== 1 ? 's' : ''}</span>`
        : '<span class="text-xs text-muted">—</span>'}
          </div>
          <div class="flex items-center flex-wrap gap-1 mt-1.5 pl-8">
            ${(p.reactions || []).map(r => `
              <button type="button"
                      class="pred-react-chip inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${r.mine ? 'bg-blue-950 border-blue-700 text-blue-200' : 'bg-bg border-border text-slate-300'}"
                      data-prediction-id="${p.prediction_id}" data-emoji="${r.emoji}"
                      title="${attrEsc((r.users || []).join(', '))}">
                ${r.emoji} ${r.count}
              </button>`).join('')}
            <div class="relative inline-block">
              <button type="button" class="pred-react-add text-xs px-2 py-0.5 rounded-full border border-border text-muted hover:text-white"
                      data-prediction-id="${p.prediction_id}">＋</button>
              <div class="pred-react-palette hidden absolute z-10 bottom-full mb-1 left-0 bg-surface border border-border rounded-lg p-1 flex gap-1 shadow-lg">
                ${reactionEmojis.map(e => `
                  <button type="button" class="pred-react-emoji text-base leading-none hover:scale-125 transition px-0.5"
                          data-prediction-id="${p.prediction_id}" data-emoji="${e}">${e}</button>`).join('')}
              </div>
            </div>
          </div>
        </div>`
    ).join('')
    : `<p class="text-muted text-xs py-3 text-center">
         ${is_locked ? 'Aucun pronostic.' : 'Pronostics révélés au coup d\'envoi 🔒'}
       </p>`;

  el.innerHTML = `
    <button id="btn-back" class="flex items-center gap-1 text-muted text-sm mb-4 hover:text-white transition">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      Retour
    </button>

    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex-1 text-center">
          <span class="text-4xl block mb-2">${flagEmoji(m.home_team)}</span>
          <span class="text-sm font-medium">${shortName(m.home_team)}</span>
        </div>
        <div class="text-center px-4">
          ${m.status === 'FINISHED' || m.status === 'LIVE'
      ? `<div class="text-2xl font-bold ${m.status === 'LIVE' ? 'text-amber-400' : ''}">${m.home_score} – ${m.away_score}</div>`
      : `<div class="text-lg font-bold text-muted">vs</div>`}
          <div class="text-xs text-muted mt-1">
            ${new Date(m.match_date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
          ${my_prediction
      ? `<div class="text-xs mt-2">Mon pronostic : <strong>${my_prediction.predicted_home}–${my_prediction.predicted_away}</strong>
               ${my_prediction.points !== null
        ? `<span class="${ptsCls(my_prediction.points)} ml-1 px-1.5 py-0.5 rounded-full">${my_prediction.points} pt${my_prediction.points !== 1 ? 's' : ''}</span>`
        : ''}</div>`
      : ''}
        </div>
        <div class="flex-1 text-center">
          <span class="text-4xl block mb-2">${flagEmoji(m.away_team)}</span>
          <span class="text-sm font-medium">${shortName(m.away_team)}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 border-t border-border pt-3">
        <div>
          <p class="text-xs text-muted mb-2 text-center">Forme (5 der.)</p>
          <div class="flex gap-1 justify-center">${formHtml(home_stats)}</div>
        </div>
        <div>
          <p class="text-xs text-muted mb-2 text-center">Forme (5 der.)</p>
          <div class="flex gap-1 justify-center">${formHtml(away_stats)}</div>
        </div>
      </div>
    </div>

    ${teamIntelHtml(homeSummary, m.home_team)}
    ${teamIntelHtml(awaySummary, m.away_team)}
    ${h2hHtml(h2h, m.home_team, m.away_team)}

    <div class="grid grid-cols-2 gap-3 mb-4 items-start">
      ${squadHtml(homeSquad, m.home_team)}
      ${squadHtml(awaySquad, m.away_team)}
    </div>

    <div class="bg-surface border border-border rounded-xl p-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Pronostics des joueurs</p>
      ${predsHtml}
    </div>`;

  document.getElementById('btn-back').addEventListener('click', () => {
    navigateTo(state.detailReturnView || 'matches');
  });

  async function reactAndReload (predictionId, emoji) {
    try {
      await API.togglePredictionReaction(predictionId, emoji);
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
    renderDetail(matchId);
  }

  el.querySelectorAll('.pred-react-chip, .pred-react-emoji').forEach(btn => {
    btn.addEventListener('click', () => reactAndReload(+btn.dataset.predictionId, btn.dataset.emoji));
  });

  el.querySelectorAll('.pred-react-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const palette = btn.parentElement.querySelector('.pred-react-palette');
      const willOpen = palette?.classList.contains('hidden');
      el.querySelectorAll('.pred-react-palette').forEach(p => p.classList.add('hidden'));
      if (willOpen) palette.classList.remove('hidden');
    });
  });

  const isLive = m.status === 'LIVE' || m.status === 'IN_PLAY' || m.status === 'PAUSED';
  if (isLive && state.currentView === 'detail') {
    state.liveDetailMatchId = matchId;
    startLivePoll(async () => {
      if (state.currentView !== 'detail' || state.liveDetailMatchId !== matchId) {
        stopLivePoll();
        return;
      }
      await renderDetail(matchId);
    }, 30000);
  }
}
