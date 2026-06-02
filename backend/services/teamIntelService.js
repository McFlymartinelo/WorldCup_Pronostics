'use strict';
const { getH2HFromCsv } = require('./h2hCsvService');
const {
  buildTeamIntel,
  resolveTeamKey,
  canonicalName,
} = require('./teamIntelBuilder');

async function getTeamIntel (teamName) {
  try {
    const intel = await buildTeamIntel(teamName);
    if (!intel) {
      return { found: false, teamName };
    }
    return intel;
  } catch (e) {
    console.warn(`[teamIntel] ${teamName}:`, e.message);
    return { found: false, teamName, error: e.message };
  }
}

async function getH2H (teamA, teamB) {
  try {
    return await getH2HFromCsv(teamA, teamB);
  } catch (e) {
    console.warn(`[h2h] CSV ${teamA} vs ${teamB}:`, e.message);
    return {
      found: false,
      team_a: canonicalName(teamA) || teamA,
      team_b: canonicalName(teamB) || teamB,
      summary: 'Confrontations directes indisponibles.',
      meetings: [],
      error: e.message,
    };
  }
}

module.exports = { getTeamIntel, getH2H, resolveTeamKey };
