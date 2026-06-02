'use strict';
const express = require('express');
const { all, get } = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { requirePool } = require('../middleware/requirePool');
const { getPoolAdvancedStats } = require('../services/statsService');
const { getPoolBadges } = require('../services/badgesService');
const { comparePlayers } = require('../services/compareService');
const { buildStandingsExport } = require('../services/exportService');
const { computeSpecialBonus } = require('../services/specialPicksService');

const router = express.Router();

async function fetchStandingsRows (poolId) {
  const rows = await all(`
    SELECT
      u.id,
      u.pseudo,
      u.avatar,
      u.color,
      COALESCE(SUM(p.points), 0)
        + CASE WHEN cm.winner_team IS NOT NULL AND pm.pick_winner = cm.winner_team THEN 5 ELSE 0 END
        + CASE WHEN cm.top_scorer IS NOT NULL AND pm.pick_top_scorer = cm.top_scorer THEN 3 ELSE 0 END
                                                     AS total_points,
      COALESCE(SUM(p.points), 0)                     AS match_points,
      CASE WHEN cm.winner_team IS NOT NULL AND pm.pick_winner = cm.winner_team THEN 5 ELSE 0 END AS bonus_winner,
      CASE WHEN cm.top_scorer IS NOT NULL AND pm.pick_top_scorer = cm.top_scorer THEN 3 ELSE 0 END AS bonus_scorer,
      COUNT(p.id)                                    AS total_predictions,
      SUM(CASE WHEN p.points = 3 THEN 1 ELSE 0 END) AS exact_scores,
      SUM(CASE WHEN p.points = 2 THEN 1 ELSE 0 END) AS good_diff,
      SUM(CASE WHEN p.points = 1 THEN 1 ELSE 0 END) AS good_results,
      SUM(CASE WHEN p.points = 0 THEN 1 ELSE 0 END) AS wrong
    FROM pool_members pm
    JOIN users u ON u.id = pm.user_id
    LEFT JOIN predictions p
           ON p.user_id = u.id AND p.pool_id = pm.pool_id AND p.points IS NOT NULL
    LEFT JOIN competition_meta cm ON cm.id = 1
    WHERE pm.pool_id = ? AND u.role = 'player'
    GROUP BY u.id
  `, [poolId]);

  for (const row of rows) {
    const special = await computeSpecialBonus(row.id, poolId);
    row.bonus_special = special.points;
    row.total_points = (row.total_points || 0) + special.points;
  }

  rows.sort((a, b) =>
    b.total_points - a.total_points || a.pseudo.localeCompare(b.pseudo, 'fr'),
  );
  return rows;
}

router.get('/advanced', requireAuth, requirePool, async (req, res) => {
  try {
    const data = await getPoolAdvancedStats(req.poolId);
    res.json(data);
  } catch (e) {
    console.error('[stats/advanced]', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/badges', requireAuth, requirePool, async (req, res) => {
  try {
    const badges = await getPoolBadges(req.poolId);
    res.json(badges);
  } catch (e) {
    console.error('[stats/badges]', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/compare/:opponentId', requireAuth, requirePool, async (req, res) => {
  try {
    const opponentId = parseInt(req.params.opponentId, 10);
    if (!Number.isInteger(opponentId)) {
      return res.status(400).json({ error: 'Joueur invalide' });
    }
    if (opponentId === req.user.id) {
      return res.status(400).json({ error: 'Choisissez un autre joueur' });
    }
    const member = await get(
      'SELECT 1 FROM pool_members WHERE pool_id = ? AND user_id = ?',
      [req.poolId, opponentId],
    );
    if (!member) return res.status(404).json({ error: 'Joueur introuvable dans ce groupe' });

    const data = await comparePlayers(req.poolId, req.user.id, opponentId);
    if (!data) return res.status(404).json({ error: 'Comparaison impossible' });
    res.json(data);
  } catch (e) {
    console.error('[stats/compare]', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/export', requireAuth, requirePool, async (req, res) => {
  try {
    const pool = await get('SELECT name FROM pools WHERE id = ?', [req.poolId]);
    const rows = await fetchStandingsRows(req.poolId);
    const text = await buildStandingsExport(rows, pool?.name || 'Groupe');
    res.json({ text, pool_name: pool?.name || 'Groupe' });
  } catch (e) {
    console.error('[stats/export]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.fetchStandingsRows = fetchStandingsRows;
