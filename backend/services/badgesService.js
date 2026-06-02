'use strict';
const { getPoolAdvancedStats } = require('./statsService');

/**
 * Badges automatiques par joueur dans un groupe.
 * @returns {Record<number, Array<{id, emoji, label}>>}
 */
async function getPoolBadges (poolId) {
  const stats = await getPoolAdvancedStats(poolId);
  const badgesByUser = {};
  for (const p of stats.players) badgesByUser[p.id] = [];

  const players = stats.players;
  if (!players.length) return badgesByUser;

  function award (predicate, badge) {
    const eligible = players.filter(predicate);
    if (!eligible.length) return;
    for (const p of eligible) badgesByUser[p.id].push(badge);
  }

  const maxExact = Math.max(...players.map(p => p.exact_scores));
  if (maxExact > 0) {
    award(p => p.exact_scores === maxExact, { id: 'exact_king', emoji: '👑', label: 'Roi des exacts' });
  }

  const withPreds = players.filter(p => p.predictions_scored >= 3);
  if (withPreds.length) {
    const maxExactPct = Math.max(...withPreds.map(p => p.exact_pct));
    award(
      p => p.predictions_scored >= 3 && p.exact_pct === maxExactPct && p.exact_scores > 0,
      { id: 'sniper', emoji: '🎯', label: 'Sniper' },
    );
  }

  const maxGood = Math.max(...players.map(p => p.good_results));
  if (maxGood > 0) {
    award(p => p.good_results === maxGood, { id: 'lucky', emoji: '🍀', label: 'Bon nose' });
  }

  const maxWrong = Math.max(...players.map(p => p.wrong));
  if (maxWrong >= 3) {
    award(p => p.wrong === maxWrong, { id: 'cursed', emoji: '💀', label: 'Serial raté' });
  }

  award(p => p.bonus_winner, { id: 'visionary', emoji: '🔮', label: 'Visionnaire' });
  award(p => p.bonus_scorer, { id: 'oracle', emoji: '⚽', label: 'Oracle buteur' });

  if (stats.points_series?.length && stats.labels?.length > 2) {
    let bestComeback = { userId: null, delta: 0 };
    for (const s of stats.points_series) {
      const ranks = s.ranks || [];
      if (ranks.length < 3) continue;
      const mid = Math.floor(ranks.length / 2);
      const delta = (ranks[mid] ?? ranks[0]) - (ranks[ranks.length - 1] ?? ranks[mid]);
      if (delta > bestComeback.delta) bestComeback = { userId: s.user_id, delta };
    }
    if (bestComeback.userId && bestComeback.delta >= 2) {
      badgesByUser[bestComeback.userId].push({ id: 'comeback', emoji: '📈', label: 'Comeback' });
    }
  }

  return badgesByUser;
}

async function getUserBadges (poolId, userId) {
  const map = await getPoolBadges(poolId);
  return map[userId] || [];
}

module.exports = { getPoolBadges, getUserBadges };
