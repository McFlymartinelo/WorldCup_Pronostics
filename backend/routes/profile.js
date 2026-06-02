'use strict';
const express         = require('express');
const { run, get }    = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const {
  isPicksLocked,
  getCompetitionMeta,
  getTournamentTeams,
} = require('../services/competitionPicks');

const router = express.Router();

async function profilePayload (userId) {
  const user = await get(
    `SELECT id, pseudo, avatar, color, role, pick_winner, pick_top_scorer
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) return null;

  const meta = await getCompetitionMeta();
  const locked = await isPicksLocked();

  const bonus_winner = meta?.winner_team && user.pick_winner === meta.winner_team ? 5 : 0;
  const bonus_scorer = meta?.top_scorer && user.pick_top_scorer === meta.top_scorer ? 3 : 0;

  const teams = await getTournamentTeams();
  let scorers = [];
  try {
    const { getAllScorerNames } = require('./squads');
    scorers = await getAllScorerNames();
  } catch (e) {
    console.warn('[profile] scorers:', e.message);
  }

  return {
    ...user,
    teams,
    scorers,
    picks_locked: locked,
    actual_winner: meta?.winner_team || null,
    actual_top_scorer: meta?.top_scorer || null,
    bonus_winner,
    bonus_scorer,
  };
}

// GET /api/profile/pick-options (rétrocompat — préférer GET /api/profile)
router.get('/pick-options', requireAuth, async (req, res) => {
  const payload = await profilePayload(req.user.id);
  if (!payload) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({
    teams: payload.teams,
    scorers: payload.scorers,
    picks_locked: payload.picks_locked,
  });
});

// GET /api/profile
router.get('/', requireAuth, async (req, res) => {
  const payload = await profilePayload(req.user.id);
  if (!payload) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(payload);
});

// PATCH /api/profile
router.patch('/', requireAuth, async (req, res) => {
  const { avatar, color, pick_winner, pick_top_scorer } = req.body;

  if (avatar && [...avatar].length > 4)
    return res.status(400).json({ error: 'Avatar invalide' });
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color))
    return res.status(400).json({ error: 'Couleur invalide' });

  const wantsPickUpdate =
    pick_winner !== undefined || pick_top_scorer !== undefined;

  if (wantsPickUpdate && await isPicksLocked()) {
    return res.status(403).json({
      error: 'Les pronostics vainqueur et meilleur buteur sont verrouillés (le tournoi a commencé)',
    });
  }

  if (pick_winner !== undefined && pick_winner !== null && pick_winner !== '') {
    const teams = await getTournamentTeams();
    if (!teams.includes(pick_winner)) {
      return res.status(400).json({ error: 'Équipe invalide' });
    }
  }

  if (pick_top_scorer !== undefined && pick_top_scorer !== null && pick_top_scorer !== '') {
    let scorers = [];
    try {
      const { getAllScorerNames } = require('./squads');
      scorers = await getAllScorerNames();
    } catch { /* liste vide */ }
    if (scorers.length && !scorers.includes(pick_top_scorer)) {
      return res.status(400).json({ error: 'Joueur invalide — synchronisez les sélections (admin)' });
    }
  }

  const sets = [];
  const params = [];

  if (avatar !== undefined) { sets.push('avatar = ?'); params.push(avatar || '⚽'); }
  if (color !== undefined)  { sets.push('color = ?');  params.push(color || '#3b82f6'); }

  if (pick_winner !== undefined && !await isPicksLocked()) {
    sets.push('pick_winner = ?');
    params.push(pick_winner || null);
  }
  if (pick_top_scorer !== undefined && !await isPicksLocked()) {
    sets.push('pick_top_scorer = ?');
    params.push(pick_top_scorer || null);
  }

  if (!sets.length) return res.status(400).json({ error: 'Aucune modification' });

  params.push(req.user.id);
  await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);

  const payload = await profilePayload(req.user.id);
  res.json(payload);
});

module.exports = router;
