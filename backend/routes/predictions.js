'use strict';
const express = require('express');
const { run, get } = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { requirePool } = require('../middleware/requirePool');

const router = express.Router();

router.post('/', requireAuth, requirePool, async (req, res) => {
  try {
    const { match_id, predicted_home, predicted_away } = req.body;

    if (match_id == null || predicted_home == null || predicted_away == null) {
      return res.status(400).json({ error: 'match_id, predicted_home, predicted_away requis' });
    }
    if (!Number.isInteger(predicted_home) || !Number.isInteger(predicted_away)
        || predicted_home < 0 || predicted_away < 0) {
      return res.status(400).json({ error: 'Scores invalides' });
    }

    const match = await get('SELECT match_date FROM matches WHERE id = ?', [match_id]);
    if (!match) return res.status(404).json({ error: 'Match introuvable' });

    if (new Date(match.match_date) <= new Date()) {
      return res.status(403).json({ error: 'Les pronostics sont fermés pour ce match' });
    }

    await run(`
      INSERT INTO predictions (user_id, match_id, pool_id, predicted_home, predicted_away)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, match_id, pool_id)
      DO UPDATE SET
        predicted_home = excluded.predicted_home,
        predicted_away = excluded.predicted_away,
        points = NULL,
        updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, match_id, req.poolId, predicted_home, predicted_away]);

    res.json({ success: true });
  } catch (e) {
    console.error('[predictions]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
