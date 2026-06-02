'use strict';
const { all, get } = require('../database/db');

function shortMatchLabel (m) {
  const d = m.match_date ? String(m.match_date).slice(5, 10) : '';
  const h = (m.home_team || '').slice(0, 3);
  const a = (m.away_team || '').slice(0, 3);
  return d ? `${d} ${h}-${a}` : `${h}-${a}`;
}

function computeRanks (members, cumulative, step) {
  const scores = members.map(m => ({
    id: m.id,
    pseudo: m.pseudo,
    pts: cumulative[m.id][step] ?? 0,
  })).sort((a, b) => b.pts - a.pts || a.pseudo.localeCompare(b.pseudo, 'fr'));

  const ranks = {};
  let rank = 0;
  let prevPts = null;
  for (let i = 0; i < scores.length; i++) {
    if (prevPts === null || scores[i].pts < prevPts) rank = i + 1;
    ranks[scores[i].id] = rank;
    prevPts = scores[i].pts;
  }
  return ranks;
}

async function getPoolAdvancedStats (poolId) {
  const members = await all(`
    SELECT u.id, u.pseudo, u.avatar, u.color, pm.pick_winner, pm.pick_top_scorer
    FROM pool_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.pool_id = ? AND u.role = 'player'
    ORDER BY u.pseudo COLLATE NOCASE ASC
  `, [poolId]);

  if (!members.length) {
    return {
      labels: ['Départ'],
      points_series: [],
      players: [],
      distribution: { exact_scores: 0, good_results: 0, wrong: 0 },
      finished_matches: 0,
    };
  }

  const meta = await get('SELECT winner_team, top_scorer FROM competition_meta WHERE id = 1');

  const finishedMatches = await all(`
    SELECT id, match_date, home_team, away_team, home_score, away_score, group_name
    FROM matches
    WHERE status = 'FINISHED'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL
    ORDER BY match_date ASC, id ASC
  `);

  const preds = await all(`
    SELECT user_id, match_id, points
    FROM predictions
    WHERE pool_id = ? AND points IS NOT NULL
  `, [poolId]);

  const pointsByUserMatch = {};
  for (const p of preds) {
    if (!pointsByUserMatch[p.user_id]) pointsByUserMatch[p.user_id] = {};
    pointsByUserMatch[p.user_id][p.match_id] = p.points;
  }

  const labels = ['Départ'];
  for (const m of finishedMatches) labels.push(shortMatchLabel(m));

  const bonusWinner = meta?.winner_team || null;
  const bonusScorer = meta?.top_scorer || null;
  const hasBonus = Boolean(bonusWinner || bonusScorer);
  if (hasBonus) labels.push('Bonus');

  const cumulative = {};
  const rankSeries = {};
  for (const m of members) {
    cumulative[m.id] = [0];
    rankSeries[m.id] = [];
  }

  const running = {};
  for (const m of members) running[m.id] = 0;

  for (const match of finishedMatches) {
    for (const m of members) {
      running[m.id] += pointsByUserMatch[m.id]?.[match.id] ?? 0;
      cumulative[m.id].push(running[m.id]);
    }
  }

  if (hasBonus) {
    for (const m of members) {
      let bonus = 0;
      if (bonusWinner && m.pick_winner === bonusWinner) bonus += 5;
      if (bonusScorer && m.pick_top_scorer === bonusScorer) bonus += 3;
      running[m.id] += bonus;
      cumulative[m.id].push(running[m.id]);
    }
  }

  for (let step = 0; step < labels.length; step++) {
    const ranks = computeRanks(members, cumulative, step);
    for (const m of members) rankSeries[m.id].push(ranks[m.id]);
  }

  const players = members.map(m => {
    const userPreds = preds.filter(p => p.user_id === m.id);
    const exact = userPreds.filter(p => p.points === 3).length;
    const good = userPreds.filter(p => p.points === 1).length;
    const wrong = userPreds.filter(p => p.points === 0).length;
    const matchPts = userPreds.reduce((s, p) => s + p.points, 0);
    const gotWinner = Boolean(bonusWinner && m.pick_winner === bonusWinner);
    const gotScorer = Boolean(bonusScorer && m.pick_top_scorer === bonusScorer);
    const bonusPts = (gotWinner ? 5 : 0) + (gotScorer ? 3 : 0);
    const scored = userPreds.length;

    return {
      id: m.id,
      pseudo: m.pseudo,
      avatar: m.avatar || '⚽',
      color: m.color || '#3b82f6',
      total_points: matchPts + bonusPts,
      match_points: matchPts,
      bonus_winner: gotWinner,
      bonus_scorer: gotScorer,
      exact_scores: exact,
      good_results: good,
      wrong,
      predictions_scored: scored,
      accuracy_pct: scored ? Math.round(((exact + good) / scored) * 100) : 0,
      exact_pct: scored ? Math.round((exact / scored) * 100) : 0,
      avg_points: scored ? Math.round((matchPts / scored) * 100) / 100 : 0,
      current_rank: rankSeries[m.id][rankSeries[m.id].length - 1] ?? members.length,
    };
  }).sort((a, b) => b.total_points - a.total_points || a.pseudo.localeCompare(b.pseudo, 'fr'));

  return {
    labels,
    points_series: members.map(m => ({
      user_id: m.id,
      pseudo: m.pseudo,
      color: m.color || '#3b82f6',
      points: cumulative[m.id],
      ranks: rankSeries[m.id],
    })),
    players,
    distribution: {
      exact_scores: players.reduce((s, p) => s + p.exact_scores, 0),
      good_results: players.reduce((s, p) => s + p.good_results, 0),
      wrong: players.reduce((s, p) => s + p.wrong, 0),
    },
    finished_matches: finishedMatches.length,
    has_bonus: hasBonus,
  };
}

module.exports = { getPoolAdvancedStats };
