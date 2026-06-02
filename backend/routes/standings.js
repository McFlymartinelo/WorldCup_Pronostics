'use strict';
const express         = require('express');
const { all }         = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (_req, res) => {
  try {
    const rows = await all(`
      SELECT
        u.id,
        u.pseudo,
        u.avatar,
        u.color,
        COALESCE(SUM(p.points), 0)
          + CASE WHEN cm.winner_team IS NOT NULL AND u.pick_winner = cm.winner_team THEN 5 ELSE 0 END
          + CASE WHEN cm.top_scorer IS NOT NULL AND u.pick_top_scorer = cm.top_scorer THEN 3 ELSE 0 END
                                                       AS total_points,
        COALESCE(SUM(p.points), 0)                     AS match_points,
        CASE WHEN cm.winner_team IS NOT NULL AND u.pick_winner = cm.winner_team THEN 5 ELSE 0 END AS bonus_winner,
        CASE WHEN cm.top_scorer IS NOT NULL AND u.pick_top_scorer = cm.top_scorer THEN 3 ELSE 0 END AS bonus_scorer,
        COUNT(p.id)                                    AS total_predictions,
        SUM(CASE WHEN p.points = 3 THEN 1 ELSE 0 END) AS exact_scores,
        SUM(CASE WHEN p.points = 1 THEN 1 ELSE 0 END) AS good_results,
        SUM(CASE WHEN p.points = 0 THEN 1 ELSE 0 END) AS wrong
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id AND p.points IS NOT NULL
      LEFT JOIN competition_meta cm ON cm.id = 1
      WHERE u.role = 'player'
      GROUP BY u.id
      ORDER BY total_points DESC, u.pseudo ASC
    `);
    res.json(rows);
  } catch (e) {
    console.error('[standings]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;