'use strict';

function escHtml (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Échappement pour attributs HTML (guillemets doubles). */
function attrEsc (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function formDots (formStr) {
  if (!formStr) return '<span class="text-muted text-xs">—</span>';
  return formStr.split(' ').filter(Boolean).map(r => {
    const c = r === 'V' || r === 'W' ? 'W' : r === 'D' ? 'D' : r === 'N' ? 'D' : 'L';
    return `<span class="form-${c} w-5 h-5 rounded-full text-[10px] font-bold inline-flex items-center justify-center">${r === 'W' ? 'V' : r}</span>`;
  }).join('');
}

function matchLinesHtml (lines, emptyMsg = '—') {
  if (!lines?.length) return `<p class="text-xs text-muted">${emptyMsg}</p>`;
  return `<div class="space-y-1">${lines.map(l => {
    const venue = l.venue ? `<span class="text-[10px] px-1.5 py-0.5 rounded ${l.venue === 'V' ? 'bg-green-950 text-green-400' : l.venue === 'D' ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-400'}">${l.venue === 'V' ? 'V' : l.venue === 'D' ? 'D' : 'N'}</span>` : '';
    const meta = [l.date, l.competition].filter(Boolean).join(' · ');
    return `<div class="flex items-center gap-2 text-xs py-1 border-b border-border last:border-0">
      ${venue}
      <span class="text-slate-300 flex-1">${escHtml(teamName(l.opponent || '?'))}</span>
      <span class="font-semibold text-white">${escHtml(l.score || '')}</span>
      ${meta ? `<span class="text-muted text-[10px]">${escHtml(meta)}</span>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function teamIntelHtml (summary, teamName) {
  if (!summary?.found) return `
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        ${flagEmoji(teamName)} ${shortName(teamName)}
      </p>
      <p class="text-xs text-muted italic">Données non disponibles</p>
    </div>`;

  const friendlies = summary.friendlies_live || summary.friendlies || [];
  const qualMatches = summary.qualification_matches || [];

  return `
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <div class="flex items-start justify-between gap-2 mb-3">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider">
          ${flagEmoji(teamName)} ${shortName(teamName)}
        </p>
        ${summary.fifa_rank ? `<span class="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded-full shrink-0">FIFA #${summary.fifa_rank}</span>` : ''}
      </div>

      ${summary.history ? `<p class="text-xs text-slate-400 italic mb-3 leading-relaxed">${escHtml(summary.history)}</p>` : ''}

      <div class="grid grid-cols-2 gap-2 mb-3 text-xs">
        ${summary.best_wc ? `<div class="bg-bg rounded-lg p-2"><p class="text-muted text-[10px] mb-0.5">Meilleur résultat CdM</p><p class="text-white font-medium">${escHtml(summary.best_wc)}</p></div>` : ''}
        ${summary.wc_2022 || summary.wc_2018 ? `<div class="bg-bg rounded-lg p-2"><p class="text-muted text-[10px] mb-0.5">CdM récentes</p><p class="text-white">${summary.wc_2022 ? `2022: ${escHtml(summary.wc_2022)}` : ''}${summary.wc_2022 && summary.wc_2018 ? '<br>' : ''}${summary.wc_2018 ? `2018: ${escHtml(summary.wc_2018)}` : ''}</p></div>` : ''}
      </div>

      ${summary.qualification ? `
        <details class="intel-block mb-2" open>
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">🛤️ Parcours qualificatif</summary>
          <p class="text-xs text-slate-400 mt-1 mb-2">${escHtml(summary.qualification)}</p>
          ${matchLinesHtml(qualMatches)}
        </details>` : ''}

      ${summary.streak || summary.form_extended ? `
        <details class="intel-block mb-2">
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">📈 Série & forme</summary>
          <div class="mt-2 space-y-2">
            ${summary.streak ? `<p class="text-xs text-amber-400/90">Série : ${escHtml(summary.streak)}</p>` : ''}
            ${summary.form_extended ? `<div class="flex flex-wrap gap-1 items-center"><span class="text-[10px] text-muted mr-1">12 der. :</span>${formDots(summary.form_extended)}</div>` : ''}
          </div>
        </details>` : ''}

      ${friendlies.length ? `
        <details class="intel-block mb-2">
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">🤝 Matchs de préparation</summary>
          <div class="mt-2">${matchLinesHtml(friendlies.map(f => ({ opponent: f.opponent, score: f.score, date: f.date, venue: null })))}</div>
        </details>` : ''}

      ${summary.watch?.length ? `
        <details class="intel-block mb-2" open>
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">👀 Joueurs à surveiller</summary>
          <div class="flex flex-wrap gap-1.5 mt-2">
            ${summary.watch.map(p => `<span class="text-xs bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded-full">${escHtml(p)}</span>`).join('')}
          </div>
        </details>` : ''}

      ${summary.best ? `
        <details class="intel-block">
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">📚 Fiche historique</summary>
          <div class="mt-2 space-y-1 text-xs">
            <p><span class="text-muted">Star actuelle :</span> <span class="text-white">${escHtml(summary.best)}</span></p>
            <p><span class="text-muted">Record capé :</span> <span class="text-white">${escHtml(summary.capped)}</span></p>
            <p><span class="text-muted">Record buteur :</span> <span class="text-white">${escHtml(summary.scorer)}</span></p>
          </div>
        </details>` : ''}
    </div>`;
}

function h2hHtml (h2h, home, away) {
  const meetings = h2h?.meetings || [];
  const total = h2h?.stats?.total;
  const more = total && total > meetings.length
    ? `<p class="text-[10px] text-muted italic mb-2">${total - meetings.length} match(s) plus ancien(s) non affiché(s).</p>`
    : '';
  return `
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        ⚔️ Confrontations directes
      </p>
      <p class="text-xs text-slate-400 mb-3">
        ${flagEmoji(home)} ${shortName(home)} vs ${flagEmoji(away)} ${shortName(away)}
      </p>
      ${h2h?.summary ? `<p class="text-xs text-slate-300 mb-3">${escHtml(translateTeamsInText(h2h.summary))}</p>` : ''}
      ${h2h?.stats ? `<p class="text-[10px] text-muted mb-2">${h2h.stats.played} matchs joués · ${teamName(h2h.team_a)}: ${h2h.stats.wins_a}V · N: ${h2h.stats.draws} · ${teamName(h2h.team_b)}: ${h2h.stats.wins_b}V${h2h.stats.upcoming ? ` · ${h2h.stats.upcoming} à venir` : ''}</p>` : ''}
      ${more}
      ${meetings.length ? `<div class="space-y-1">${meetings.map(mt => `
        <div class="text-xs py-1.5 border-b border-border last:border-0 flex flex-wrap gap-x-2">
          <span class="text-muted">${escHtml(mt.date || '')}</span>
          <span class="text-slate-400">${escHtml(mt.comp || '')}</span>
          <span class="font-semibold text-white">${escHtml(mt.score || '')}</span>
          ${mt.note ? `<span class="text-slate-400">${escHtml(translateTeamsInText(mt.note))}</span>` : ''}
        </div>`).join('')}</div>`
      : `<p class="text-xs text-muted italic">Aucune confrontation recensée.</p>`}
    </div>`;
}

function updateNotifBtn (btn, subscribed) {
  btn.dataset.subscribed = subscribed;
  btn.title = subscribed ? 'Notifications activées — cliquer pour désactiver' : 'Activer les notifications';
  btn.style.color = subscribed ? '#22c55e' : '';
}

function urlBase64ToUint8Array (base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function ptsCls (pts) {
  if (pts === 3) return 'pts-3';
  if (pts === 1) return 'pts-1';
  return 'pts-0';
}

function shortName (name) {
  const translated = teamName(name);
  return translated.length > 14 ? translated.slice(0, 13) + '…' : translated;
}

const FLAGS = {
  'Mexico': '🇲🇽',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Czechia': '🇨🇿',
  'Canada': '🇨🇦',
  'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭',
  'Bosnia-Herzegovina': '🇧🇦',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Spain': '🇪🇸',
  'Portugal': '🇵🇹',
  'USA': '🇺🇸',
  'Morocco': '🇲🇦',
  'Japan': '🇯🇵',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Croatia': '🇭🇷',
  'Senegal': '🇸🇳',
  'Australia': '🇦🇺',
  'Serbia': '🇷🇸',
  'Poland': '🇵🇱',
  'Denmark': '🇩🇰',
  'Uruguay': '🇺🇾',
  'Ecuador': '🇪🇨',
  'Tunisia': '🇹🇳',
  'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Costa Rica': '🇨🇷',
  'Cameroon': '🇨🇲',
  'Ghana': '🇬🇭',
  'Colombia': '🇨🇴',
  'Venezuela': '🇻🇪',
  'Chile': '🇨🇱',
  'Peru': '🇵🇪',
  'Nigeria': '🇳🇬',
  'Egypt': '🇪🇬',
  'Algeria': '🇩🇿',
  'New Zealand': '🇳🇿',
  'Indonesia': '🇮🇩',
};

function flagEmoji (name) {
  const key = typeof resolveTeamKey === 'function' ? resolveTeamKey(name) : name;
  if (FLAGS[key] || FLAGS[name]) return FLAGS[key] || FLAGS[name];
  if (typeof TEAMS !== 'undefined' && TEAMS[key]?.flag) return TEAMS[key].flag;
  return '🏳️';
}
