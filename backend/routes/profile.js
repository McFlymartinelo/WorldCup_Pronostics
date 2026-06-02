'use strict';
const express = require('express');
const { run, get } = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { requirePool } = require('../middleware/requirePool');
const {
  isPicksLocked,
  getCompetitionMeta,
  getTournamentTeams,
} = require('../services/competitionPicks');
const { getMemberPicks, updateMemberPicks } = require('../services/poolService');
const {
  getGroupList,
  getTeamsInGroup,
  getMemberSpecialPicks,
  updateMemberSpecialPicks,
  computeSpecialBonus,
  getGroupLocks,
  isGroupPicksLocked,
  groupKey,
} = require('../services/specialPicksService');
const { getUserBadges } = require('../services/badgesService');

const router = express.Router();

async function profilePayload (userId, poolId) {
  const user = await get(
    `SELECT id, pseudo, avatar, color, role FROM users WHERE id = ?`,
    [userId],
  );
  if (!user) return null;

  const picks = await getMemberPicks(userId, poolId);
  const meta = await getCompetitionMeta();
  const locked = await isPicksLocked();

  const pickWinner = picks?.pick_winner ?? null;
  const pickTopScorer = picks?.pick_top_scorer ?? null;

  const bonus_winner = meta?.winner_team && pickWinner === meta.winner_team ? 5 : 0;
  const bonus_scorer = meta?.top_scorer && pickTopScorer === meta.top_scorer ? 3 : 0;
  const special = await computeSpecialBonus(userId, poolId);
  const badges = await getUserBadges(poolId, userId);
  const groups = await getGroupList();
  const special_picks = await getMemberSpecialPicks(userId, poolId);
  const group_locks = await getGroupLocks();
  const group_options = {};
  for (const g of groups) {
    group_options[g] = await getTeamsInGroup(g);
  }

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
    pool_id: poolId,
    pick_winner: pickWinner,
    pick_top_scorer: pickTopScorer,
    special_picks,
    group_locks,
    group_options,
    teams,
    scorers,
    picks_locked: locked,
    actual_winner: meta?.winner_team || null,
    actual_top_scorer: meta?.top_scorer || null,
    bonus_winner,
    bonus_scorer,
    bonus_special: special.points,
    badges,
  };
}

router.get('/pick-options', requireAuth, requirePool, async (req, res) => {
  const payload = await profilePayload(req.user.id, req.poolId);
  if (!payload) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({
    teams: payload.teams,
    scorers: payload.scorers,
    picks_locked: payload.picks_locked,
  });
});

router.get('/', requireAuth, requirePool, async (req, res) => {
  const payload = await profilePayload(req.user.id, req.poolId);
  if (!payload) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(payload);
});

router.patch('/', requireAuth, requirePool, async (req, res) => {
  const { avatar, color, pick_winner, pick_top_scorer, special_picks } = req.body;

  if (avatar && [...avatar].length > 4) {
    return res.status(400).json({ error: 'Avatar invalide' });
  }
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: 'Couleur invalide' });
  }

  const wantsPickUpdate =
    pick_winner !== undefined || pick_top_scorer !== undefined;
  const wantsSpecialUpdate = special_picks !== undefined;

  if (wantsPickUpdate && await isPicksLocked()) {
    return res.status(403).json({
      error: 'Les pronostics bonus sont verrouillés (le tournoi a commencé)',
    });
  }

  if (wantsSpecialUpdate && special_picks && typeof special_picks === 'object') {
    const existing = await getMemberSpecialPicks(req.user.id, req.poolId);
    const groups = await getGroupList();
    for (const g of groups) {
      if (!await isGroupPicksLocked(g)) continue;
      for (const pos of [1, 2]) {
        const key = groupKey(g, pos);
        if (special_picks[key] !== undefined && special_picks[key] !== existing[key]) {
          return res.status(403).json({
            error: `Paris spéciaux verrouillés pour ${g.replace(/^GROUP_/i, 'groupe ')} (match commencé)`,
          });
        }
      }
    }
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

  const userSets = [];
  const userParams = [];

  if (avatar !== undefined) { userSets.push('avatar = ?'); userParams.push(avatar || '⚽'); }
  if (color !== undefined)  { userSets.push('color = ?');  userParams.push(color || '#3b82f6'); }

  if (userSets.length) {
    userParams.push(req.user.id);
    await run(`UPDATE users SET ${userSets.join(', ')} WHERE id = ?`, userParams);
  }

  if (wantsPickUpdate && !await isPicksLocked()) {
    await updateMemberPicks(req.user.id, req.poolId, pick_winner, pick_top_scorer);
  } else if (wantsPickUpdate) {
    return res.status(403).json({
      error: 'Les pronostics bonus sont verrouillés (le tournoi a commencé)',
    });
  }

  if (wantsSpecialUpdate && special_picks && typeof special_picks === 'object') {
    const groups = await getGroupList();
    const existing = await getMemberSpecialPicks(req.user.id, req.poolId);
    const merged = { ...existing };
    for (const g of groups) {
      if (await isGroupPicksLocked(g)) continue;
      const allowed = await getTeamsInGroup(g);
      for (const pos of [1, 2]) {
        const key = groupKey(g, pos);
        if (special_picks[key] === undefined) continue;
        const val = special_picks[key];
        if (val && allowed.includes(val)) merged[key] = val;
        else delete merged[key];
      }
    }
    await updateMemberSpecialPicks(req.user.id, req.poolId, merged);
  }

  if (!userSets.length && !wantsPickUpdate && !wantsSpecialUpdate) {
    return res.status(400).json({ error: 'Aucune modification' });
  }

  const payload = await profilePayload(req.user.id, req.poolId);
  res.json(payload);
});

module.exports = router;
