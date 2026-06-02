'use strict';

const KNOCKOUT_LABELS = {
  ROUND_OF_32: { label: '32èmes', emoji: '⚽' },
  ROUND_OF_16: { label: '8èmes', emoji: '🔥' },
  QUARTER_FINALS: { label: 'Quarts', emoji: '💥' },
  SEMI_FINALS: { label: 'Demis', emoji: '⚡' },
  THIRD_PLACE: { label: '3e place', emoji: '🥉' },
  FINAL: { label: 'Finale', emoji: '🏆' },
};

const KNOCKOUT_ROUND_ORDER = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS'];

function bracketMatchSlotHtml (m) {
  const dateStr = new Date(m.match_date).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const scoreHtml = (m.status === 'FINISHED' || m.status === 'LIVE') && m.home_score !== null
    ? `<span class="bracket-score ${m.status === 'LIVE' ? 'live' : ''}">${m.home_score}–${m.away_score}</span>`
    : '<span class="bracket-vs">vs</span>';

  const liveBadge = m.status === 'LIVE'
    ? '<span class="bracket-live-dot" title="En cours"></span>'
    : '';

  return `
    <div class="match-row bracket-match bg-surface border border-border rounded-lg px-2 py-2 cursor-pointer hover:border-slate-600 transition"
         data-match-id="${m.id}">
      <div class="bracket-team bracket-team-home">
        <span class="bracket-flag">${flagEmoji(m.home_team)}</span>
        <span class="bracket-name">${shortName(m.home_team)}</span>
      </div>
      <div class="bracket-center">
        ${scoreHtml}
        ${liveBadge}
        <span class="bracket-date">${m.status === 'FINISHED' || m.status === 'LIVE' ? '' : dateStr}</span>
      </div>
      <div class="bracket-team bracket-team-away">
        <span class="bracket-flag">${flagEmoji(m.away_team)}</span>
        <span class="bracket-name">${shortName(m.away_team)}</span>
      </div>
    </div>`;
}

function bracketKnockoutHtml (knockout) {
  if (!knockout || typeof knockout !== 'object') return '';

  let hasKnockout = false;
  let html = '<div class="bracket-scroll">';

  for (const stage of KNOCKOUT_ROUND_ORDER) {
    const matches = knockout[stage] || [];
    if (!matches.length) continue;
    hasKnockout = true;
    const meta = KNOCKOUT_LABELS[stage] || { label: stage, emoji: '⚽' };
    html += `
      <div class="bracket-round">
        <p class="bracket-round-title">${meta.emoji} ${meta.label}</p>
        <div class="bracket-round-slots">
          ${matches.map(m => `<div class="bracket-slot">${bracketMatchSlotHtml(m)}</div>`).join('')}
        </div>
      </div>`;
  }

  const finalMatches = knockout.FINAL || [];
  const thirdMatches = knockout.THIRD_PLACE || [];
  if (finalMatches.length || thirdMatches.length) {
    hasKnockout = true;
    html += `
      <div class="bracket-round bracket-round-finals">
        <p class="bracket-round-title">🏆 Finales</p>
        <div class="bracket-finals-stack">
          ${finalMatches.map(m => `
            <div class="bracket-slot bracket-slot-final">
              <p class="bracket-slot-label">Finale</p>
              ${bracketMatchSlotHtml(m)}
            </div>`).join('')}
          ${thirdMatches.map(m => `
            <div class="bracket-slot bracket-slot-third">
              <p class="bracket-slot-label">3e place</p>
              ${bracketMatchSlotHtml(m)}
            </div>`).join('')}
        </div>
      </div>`;
  }

  html += '</div>';
  return hasKnockout ? html : '';
}

function matchRowHtml (m) {
  const dateStr = new Date(m.match_date).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const statusBadge = (() => {
    if (m.status === 'LIVE') return `<span class="badge badge-live text-xs px-1.5 py-0.5 rounded-full">⬤</span>`;
    if (m.status === 'FINISHED') return `<span class="badge badge-done text-xs px-1.5 py-0.5 rounded-full">✓</span>`;
    return `<span class="text-xs text-muted">${dateStr}</span>`;
  })();

  const scoreHtml = (m.status === 'FINISHED' || m.status === 'LIVE') && m.home_score !== null
    ? `<span class="text-sm font-bold ${m.status === 'LIVE' ? 'text-amber-400' : 'text-white'}">${m.home_score} – ${m.away_score}</span>`
    : `<span class="text-xs text-muted">vs</span>`;

  return `
    <div class="match-row bg-surface border border-border rounded-xl px-3 py-2.5 cursor-pointer hover:border-slate-600 transition flex items-center gap-2"
         data-match-id="${m.id}">
      <div class="flex-1 flex items-center gap-1.5 justify-end">
        <span class="text-xs ${m.status === 'FINISHED' ? 'text-slate-400' : 'text-slate-200'} text-right">${shortName(m.home_team)}</span>
        <span class="text-lg">${flagEmoji(m.home_team)}</span>
      </div>
      <div class="flex flex-col items-center min-w-[60px]">
        ${scoreHtml}
        <div class="mt-0.5">${statusBadge}</div>
      </div>
      <div class="flex-1 flex items-center gap-1.5">
        <span class="text-lg">${flagEmoji(m.away_team)}</span>
        <span class="text-xs ${m.status === 'FINISHED' ? 'text-slate-400' : 'text-slate-200'}">${shortName(m.away_team)}</span>
      </div>
    </div>`;
}

async function renderTournament () {
  const el = document.getElementById('view-tournament');
  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;

  let data;
  try { data = await API.getTournament(); }
  catch (e) { el.innerHTML = `<p class="text-red-400 text-sm">${e.message}</p>`; return; }

  const { groups, knockout } = data;

  let html = `
    <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
      <button class="tour-tab active flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-blue-700 bg-blue-900 text-blue-300" data-tab="groups">Groupes</button>
      <button class="tour-tab flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border text-muted" data-tab="knockout">Phases finales</button>
    </div>

    <div id="tab-groups">`;

  for (const [groupName, group] of Object.entries(groups).sort()) {
    html += `
      <div class="mb-6">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Groupe ${groupName}</p>

        <div class="bg-surface border border-border rounded-xl overflow-hidden mb-3">
          <div class="grid grid-cols-12 gap-1 px-3 py-1.5 border-b border-border">
            <span class="col-span-1 text-xs text-muted">#</span>
            <span class="col-span-5 text-xs text-muted">Équipe</span>
            <span class="col-span-1 text-xs text-muted text-center">J</span>
            <span class="col-span-1 text-xs text-muted text-center">G</span>
            <span class="col-span-1 text-xs text-muted text-center">N</span>
            <span class="col-span-1 text-xs text-muted text-center">P</span>
            <span class="col-span-1 text-xs text-muted text-center">Diff</span>
            <span class="col-span-1 text-xs text-blue-400 text-center font-semibold">Pts</span>
          </div>
          ${group.standings.map((t, i) => `
            <div class="grid grid-cols-12 gap-1 px-3 py-2 border-b border-border last:border-0 ${i < 2 ? 'bg-green-950/20' : ''}">
              <span class="col-span-1 text-xs ${i < 2 ? 'text-green-400 font-semibold' : 'text-muted'}">${i + 1}</span>
              <span class="col-span-5 text-xs flex items-center gap-1">
                <span>${flagEmoji(t.team)}</span>
                <span class="${i < 2 ? 'text-white' : 'text-slate-300'}">${shortName(t.team)}</span>
              </span>
              <span class="col-span-1 text-xs text-muted text-center">${t.j}</span>
              <span class="col-span-1 text-xs text-green-400 text-center">${t.g}</span>
              <span class="col-span-1 text-xs text-muted text-center">${t.n}</span>
              <span class="col-span-1 text-xs text-red-400 text-center">${t.p}</span>
              <span class="col-span-1 text-xs text-center ${t.diff > 0 ? 'text-green-400' : t.diff < 0 ? 'text-red-400' : 'text-muted'}">${t.diff > 0 ? '+' : ''}${t.diff}</span>
              <span class="col-span-1 text-xs text-blue-400 text-center font-bold">${t.pts}</span>
            </div>`).join('')}
        </div>

        <div class="space-y-2">
          ${group.matches.map(m => matchRowHtml(m)).join('')}
        </div>
      </div>`;
  }

  html += `</div>

    <div id="tab-knockout" class="hidden">`;

  const bracketHtml = bracketKnockoutHtml(knockout);
  if (bracketHtml) {
    html += bracketHtml;
  } else {
    html += `
      <div class="text-center py-12">
        <p class="text-4xl mb-3">🏆</p>
        <p class="text-sm text-muted">Les phases finales débuteront après la phase de groupes</p>
      </div>`;
  }

  html += `</div>`;
  el.innerHTML = html;

  el.querySelectorAll('.tour-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.tour-tab').forEach(b => {
        b.className = 'tour-tab flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border text-muted';
      });
      btn.className = 'tour-tab active flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-blue-700 bg-blue-900 text-blue-300';
      document.getElementById('tab-groups').classList.add('hidden');
      document.getElementById('tab-knockout').classList.add('hidden');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    });
  });

  el.querySelectorAll('.match-row').forEach(row => {
    row.addEventListener('click', () => {
      navigateTo('detail', { matchId: +row.dataset.matchId, returnView: 'tournament' });
    });
  });
}
