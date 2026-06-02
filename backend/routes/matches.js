'use strict';
const express         = require('express');
const { all, get }    = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/matches
router.get('/', requireAuth, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const matches = await all(`
      SELECT
        m.*,
        p.predicted_home,
        p.predicted_away,
        p.points
      FROM matches m
      LEFT JOIN predictions p
             ON p.match_id = m.id AND p.user_id = ?
      ORDER BY m.match_date ASC
    `, [req.user.id]);

    const enriched = matches.map(m => ({
      ...m,
      is_locked: m.match_date <= now,
      user_prediction: m.predicted_home !== null
        ? { home: m.predicted_home, away: m.predicted_away, points: m.points }
        : null,
      predicted_home: undefined,
      predicted_away: undefined,
      points: undefined,
    }));

    res.json(enriched);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/matches/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const now   = new Date().toISOString();
    const match = await get('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (!match) return res.status(404).json({ error: 'Match introuvable' });

    const isLocked = match.match_date <= now;

    const homeStats = await get('SELECT * FROM team_stats WHERE team_name = ?', [match.home_team]);
    const awayStats = await get('SELECT * FROM team_stats WHERE team_name = ?', [match.away_team]);

    let allPredictions = [];
    if (isLocked) {
      allPredictions = await all(`
        SELECT u.pseudo, p.predicted_home, p.predicted_away, p.points
        FROM predictions p
        JOIN users u ON u.id = p.user_id
        WHERE p.match_id = ?
        ORDER BY p.points DESC
      `, [match.id]);
    }

    const myPrediction = await get(`
      SELECT predicted_home, predicted_away, points
      FROM predictions WHERE match_id = ? AND user_id = ?
    `, [match.id, req.user.id]);

    res.json({
      match,
      is_locked: isLocked,
      my_prediction: myPrediction || null,
      all_predictions: allPredictions,
      home_stats: homeStats ? {
        form: homeStats.last_5_form,
        h2h:  JSON.parse(homeStats.h2h_data || '[]'),
      } : null,
      away_stats: awayStats ? {
        form: awayStats.last_5_form,
        h2h:  JSON.parse(awayStats.h2h_data || '[]'),
      } : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;