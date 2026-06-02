'use strict';
const express         = require('express');
const { db }          = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/predictions  — crée ou met à jour un pronostic
router.post('/', requireAuth, (req, res) => {
  const { match_id, predicted_home, predicted_away } = req.body;

  if (match_id == null || predicted_home == null || predicted_away == null)
    return res.status(400).json({ error: 'match_id, predicted_home, predicted_away requis' });
  if (!Number.isInteger(predicted_home) || !Number.isInteger(predicted_away)
      || predicted_home < 0 || predicted_away < 0)
    return res.status(400).json({ error: 'Scores invalides' });

  const match = db.prepare('SELECT match_date FROM matches WHERE id = ?').get(match_id);
  if (!match) return res.status(404).json({ error: 'Match introuvable' });

  // Vérification du verrou — côté serveur, source de vérité
  if (new Date(match.match_date) <= new Date())
    return res.status(403).json({ error: 'Les pronostics sont fermés pour ce match' });

  db.prepare(`
    INSERT INTO predictions (user_id, match_id, predicted_home, predicted_away)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, match_id)
    DO UPDATE SET
      predicted_home = excluded.predicted_home,
      predicted_away = excluded.predicted_away,
      points = NULL,
      updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, match_id, predicted_home, predicted_away);

  res.json({ success: true });
});

module.exports = router;