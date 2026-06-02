'use strict';
const { all, get } = require('../database/db');
const { getUserBadges } = require('./badgesService');
const { computeSpecialBonus } = require('./specialPicksService');

async function getPlayerSummary (userId, poolId) {
  const row = await get(`
    SELECT u.id, u.pseudo, u.avatar, u.color,
           COALESCE(SUM(p.points), 0)
             + CASE WHEN cm.winner_team IS NOT NULL AND pm.pick_winner = cm.winner_team THEN 5 ELSE 0 END
             + CASE WHEN cm.top_scorer IS NOT NULL AND pm.pick_top_scorer = cm.top_scorer THEN 3 ELSE 0 END
             AS match_and_bonus_pts,
           COALESCE(SUM(p.points), 0) AS match_points,
           SUM(CASE WHEN p.points = 3 THEN 1 ELSE 0 END) AS exact_scores,
           SUM(CASE WHEN p.points = 1 THEN 1 ELSE 0 END) AS good_results,
           SUM(CASE WHEN p.points = 0 THEN 1 ELSE 0 END) AS wrong,
           COUNT(p.id) AS total_predictions
    FROM pool_members pm
    JOIN users u ON u.id = pm.user_id
    LEFT JOIN predictions p ON p.user_id = u.id AND p.pool_id = pm.pool_id AND p.points IS NOT NULL
    LEFT JOIN competition_meta cm ON cm.id = 1
    WHERE pm.pool_id = ? AND u.id = ?
    GROUP BY u.id
  `, [poolId, userId]);

  if (!row) return null;

  const special = await computeSpecialBonus(userId, poolId);
  const badges = await getUserBadges(poolId, userId);

  return {
    ...row,
    bonus_special: special.points,
    special_correct: special.correct,
    total_points: row.match_and_bonus_pts + special.points,
    badges,
  };
}

async function comparePlayers (poolId, userIdA, userIdB) {
  const [a, b] = await Promise.all([
    getPlayerSummary(userIdA, poolId),
    getPlayerSummary(userIdB, poolId),
  ]);
  if (!a || !b) return null;

  const shared = await all(`
    SELECT m.id, m.home_team, m.away_team, m.home_score, m.away_score, m.match_date,
           pa.predicted_home AS a_home, pa.predicted_away AS a_away, pa.points AS a_pts,
           pb.predicted_home AS b_home, pb.predicted_away AS b_away, pb.points AS b_pts
    FROM matches m
    JOIN predictions pa ON pa.match_id = m.id AND pa.user_id = ? AND pa.pool_id = ?
    JOIN predictions pb ON pb.match_id = m.id AND pb.user_id = ? AND pb.pool_id = ?
    WHERE m.status = 'FINISHED' AND m.home_score IS NOT NULL
    ORDER BY m.match_date ASC
  `, [userIdA, poolId, userIdB, poolId]);

  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  for (const m of shared) {
    if (m.a_pts > m.b_pts) aWins++;
    else if (m.b_pts > m.a_pts) bWins++;
    else ties++;
  }

  return {
    player_a: a,
    player_b: b,
    head_to_head: {
      matches: shared,
      a_wins: aWins,
      b_wins: bWins,
      ties,
    },
  };
}

module.exports = { comparePlayers, getPlayerSummary };
