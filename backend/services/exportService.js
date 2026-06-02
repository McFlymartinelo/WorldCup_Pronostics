'use strict';

function buildStandingsExport (rows, poolName) {
  const lines = [
    `🏆 Classement — ${poolName}`,
    'Pronostics CdM 2026',
    '',
  ];

  rows.forEach((u, i) => {
    const medals = ['🥇', '🥈', '🥉'];
    const prefix = medals[i] || `${i + 1}.`;
    const bonus = [];
    if (u.bonus_winner) bonus.push('🏆');
    if (u.bonus_scorer) bonus.push('⚽');
    if (u.bonus_special) bonus.push(`🎲+${u.bonus_special}`);
    lines.push(
      `${prefix} ${u.pseudo} — ${u.total_points} pts · ${u.exact_scores} exacts · ${u.good_results} bons ${bonus.join(' ')}`.trim(),
    );
  });

  lines.push('', '— Partagé depuis Pronostics CdM 2026');
  return lines.join('\n');
}

module.exports = { buildStandingsExport };
