'use strict';
const { get, all } = require('../database/db');
const { getCompetitionTeamNames } = require('../data/competitionTeams');

/**
 * True dès qu'au moins un match a réellement commencé.
 * TIMED / SCHEDULED = programmé (football-data.org), pas en cours.
 */
async function isPicksLocked () {
  const row = await get(`
    SELECT 1 FROM matches
    WHERE status IN ('LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED', 'ET', 'PEN', 'AWARDED')
    LIMIT 1
  `);
  return !!row;
}

async function getCompetitionMeta () {
  return get('SELECT winner_team, top_scorer FROM competition_meta WHERE id = 1');
}

async function getTournamentTeams () {
  const teams = new Set(getCompetitionTeamNames());

  const rows = await all(`
    SELECT DISTINCT team FROM (
      SELECT home_team AS team FROM matches
      UNION
      SELECT away_team AS team FROM matches
      UNION
      SELECT team_name AS team FROM team_stats
    )
    WHERE team IS NOT NULL AND TRIM(team) != ''
  `);
  for (const r of rows) teams.add(r.team);

  return [...teams].sort((a, b) => a.localeCompare(b, 'fr'));
}

module.exports = { isPicksLocked, getCompetitionMeta, getTournamentTeams };
