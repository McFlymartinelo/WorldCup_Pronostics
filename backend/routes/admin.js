'use strict';
const express                       = require('express');
const bcrypt                        = require('bcryptjs');
const { run, get, all }             = require('../database/db');
const { requireAdmin }              = require('../middleware/auth');
const { syncFixtures, syncScores }  = require('../services/footballApi');
const { syncAllTeamForms }          = require('../services/bsdApiService');
const { getTournamentTeams }        = require('../services/competitionPicks');

const router = express.Router();

// GET /api/admin/users
router.get('/users', requireAdmin, async (_req, res) => {
  const users = await all(
    `SELECT id, pseudo, role, created_at FROM users ORDER BY created_at DESC`
  );
  res.json(users);
});

// POST /api/admin/users
router.post('/users', requireAdmin, async (req, res) => {
  const { pseudo, password, role = 'player' } = req.body;
  if (!pseudo || !password)
    return res.status(400).json({ error: 'pseudo et password requis' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const { lastID } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, ?)`,
      [pseudo, hash, role]
    );
    const { addUserToGeneralPool } = require('../services/poolService');
    await addUserToGeneralPool(lastID);
    res.status(201).json({ success: true });
  } catch {
    res.status(409).json({ error: 'Pseudo déjà utilisé' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAdmin, async (req, res) => {
  await run('DELETE FROM users WHERE id = ? AND role != ?', [req.params.id, 'admin']);
  res.json({ success: true });
});

// POST /api/admin/sync/fixtures
router.post('/sync/fixtures', requireAdmin, async (_req, res) => {
  try { await syncFixtures(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/sync/scores
router.post('/sync/scores', requireAdmin, async (_req, res) => {
  try { await syncScores(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/sync/forms
router.post('/sync/forms', requireAdmin, async (_req, res) => {
  try { await syncAllTeamForms(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/sync/squads — appel direct sans HTTP interne
router.post('/sync/squads', requireAdmin, async (_req, res) => {
  try {
    const { syncSquads } = require('../routes/squads');
    const matched = await syncSquads();
    res.json({ success: true, matched });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/competition-results
router.get('/competition-results', requireAdmin, async (_req, res) => {
  const meta = await get('SELECT winner_team, top_scorer FROM competition_meta WHERE id = 1');
  const teams = await getTournamentTeams();
  let scorers = [];
  try {
    const { getAllScorerNames } = require('./squads');
    scorers = await getAllScorerNames();
  } catch { /* ignore */ }
  res.json({
    winner_team: meta?.winner_team || null,
    top_scorer: meta?.top_scorer || null,
    teams,
    scorers,
  });
});

// PATCH /api/admin/competition-results
router.patch('/competition-results', requireAdmin, async (req, res) => {
  const { winner_team, top_scorer } = req.body;
  const teams = await getTournamentTeams();

  if (winner_team !== undefined && winner_team !== null && winner_team !== '') {
    if (!teams.includes(winner_team)) {
      return res.status(400).json({ error: 'Équipe vainqueur invalide' });
    }
  }
  if (top_scorer !== undefined && top_scorer !== null && top_scorer !== '') {
    let scorers = [];
    try {
      const { getAllScorerNames } = require('./squads');
      scorers = await getAllScorerNames();
    } catch { /* ignore */ }
    if (scorers.length && !scorers.includes(top_scorer)) {
      return res.status(400).json({ error: 'Meilleur buteur invalide' });
    }
  }

  const meta = await get('SELECT winner_team, top_scorer FROM competition_meta WHERE id = 1');
  const newWinner = winner_team !== undefined ? (winner_team || null) : meta.winner_team;
  const newScorer = top_scorer !== undefined ? (top_scorer || null) : meta.top_scorer;

  await run(
    `UPDATE competition_meta SET winner_team = ?, top_scorer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    [newWinner, newScorer]
  );

  res.json({ success: true, winner_team: newWinner, top_scorer: newScorer });
});

// GET /api/admin/sync-log
router.get('/sync-log', requireAdmin, async (_req, res) => {
  const logs = await all(
    `SELECT * FROM sync_log ORDER BY ran_at DESC LIMIT 50`
  );
  res.json(logs);
});

module.exports = router;