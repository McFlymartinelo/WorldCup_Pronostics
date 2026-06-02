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

// PATCH /api/admin/users/:id/password — réinitialiser le mot de passe
router.patch('/users/:id/password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'Mot de passe requis (4 caractères min.)' });
  }
  const target = await get('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Impossible de réinitialiser un admin' });
  }
  const hash = bcrypt.hashSync(password, 10);
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, target.id]);
  res.json({ success: true });
});

// GET /api/admin/group-results
router.get('/group-results', requireAdmin, async (_req, res) => {
  const { getGroupResults, getGroupList, getTeamsInGroup } = require('../services/specialPicksService');
  const groups = await getGroupList();
  const results = await getGroupResults();
  const options = {};
  for (const g of groups) options[g] = await getTeamsInGroup(g);
  res.json({ groups, results, options });
});

// PATCH /api/admin/group-results
router.patch('/group-results', requireAdmin, async (req, res) => {
  const { group_name, position, team_name } = req.body;
  const pos = parseInt(position, 10);
  if (!group_name || ![1, 2].includes(pos)) {
    return res.status(400).json({ error: 'group_name et position (1 ou 2) requis' });
  }
  const { setGroupResult, getTeamsInGroup } = require('../services/specialPicksService');
  if (team_name) {
    const allowed = await getTeamsInGroup(group_name);
    if (!allowed.includes(team_name)) {
      return res.status(400).json({ error: 'Équipe invalide pour ce groupe' });
    }
  }
  await setGroupResult(group_name, pos, team_name || null);
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