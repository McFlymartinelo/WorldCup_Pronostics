'use strict';
const express = require('express');
const { all, get } = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { requirePool } = require('../middleware/requirePool');
const {
  getReactionsForPredictions,
  togglePredictionReaction,
  PREDICTION_EMOJIS,
} = require('../services/predictionReactionsService');

const router = express.Router();

router.get('/', requireAuth, requirePool, async (req, res) => {
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
             ON p.match_id = m.id AND p.user_id = ? AND p.pool_id = ?
      ORDER BY m.match_date ASC
    `, [req.user.id, req.poolId]);

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
    console.error('[matches]', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', requireAuth, requirePool, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const match = await get('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (!match) return res.status(404).json({ error: 'Match introuvable' });

    const isLocked = match.match_date <= now;

    const homeStats = await get('SELECT * FROM team_stats WHERE team_name = ?', [match.home_team]);
    const awayStats = await get('SELECT * FROM team_stats WHERE team_name = ?', [match.away_team]);

    let allPredictions = [];
    if (isLocked) {
      allPredictions = await all(`
        SELECT p.id AS prediction_id, u.id AS user_id,
               u.pseudo, u.avatar, u.color,
               p.predicted_home, p.predicted_away, p.points
        FROM predictions p
        JOIN users u ON u.id = p.user_id
        JOIN pool_members pm ON pm.user_id = u.id AND pm.pool_id = ?
        WHERE p.match_id = ? AND p.pool_id = ?
        ORDER BY p.points DESC
      `, [req.poolId, match.id, req.poolId]);

      const reactionsMap = await getReactionsForPredictions(
        allPredictions.map(p => p.prediction_id),
        req.user.id,
      );
      for (const p of allPredictions) {
        p.reactions = reactionsMap[p.prediction_id] || [];
      }
    }

    const myPrediction = await get(`
      SELECT predicted_home, predicted_away, points
      FROM predictions
      WHERE match_id = ? AND user_id = ? AND pool_id = ?
    `, [match.id, req.user.id, req.poolId]);

    res.json({
      match,
      is_locked: isLocked,
      my_prediction: myPrediction || null,
      all_predictions: allPredictions,
      prediction_emojis: PREDICTION_EMOJIS,
      home_stats: homeStats ? {
        form: homeStats.last_5_form,
        h2h: JSON.parse(homeStats.h2h_data || '[]'),
      } : null,
      away_stats: awayStats ? {
        form: awayStats.last_5_form,
        h2h: JSON.parse(awayStats.h2h_data || '[]'),
      } : null,
    });
  } catch (e) {
    console.error('[matches/detail]', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/predictions/:predictionId/reactions', requireAuth, requirePool, async (req, res) => {
  try {
    const predictionId = parseInt(req.params.predictionId, 10);
    if (!Number.isInteger(predictionId)) {
      return res.status(400).json({ error: 'Pronostic invalide' });
    }
    const result = await togglePredictionReaction(
      req.poolId, req.user.id, predictionId, req.body.emoji,
    );
    res.json(result);
  } catch (e) {
    console.error('[matches/react]', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

module.exports = router;
