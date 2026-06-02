'use strict';
const fetch       = require('node-fetch');
const { run, get, all } = require('../database/db');

const BASE = 'https://sports.bzzoiro.com/api/v2';
const KEY  = process.env.BSD_API_KEY;

const headers = { 'Authorization': `Token ${KEY}` };

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`BSD API ${res.status}: ${path}`);
  return res.json();
}

// Récupère la forme des 5 derniers matchs d'une équipe
async function fetchTeamForm(teamName) {
  try {
    const data = await apiFetch(
      `/events/?team_name=${encodeURIComponent(teamName)}&status=finished&limit=5`
    );
    const matches = data.results || [];
    if (matches.length === 0) return '';

    const form = matches.map(m => {
      const isHome = m.home_team?.name?.toLowerCase() === teamName.toLowerCase();
      const homeScore = m.home_score;
      const awayScore = m.away_score;
      if (homeScore == null || awayScore == null) return '?';
      const [mine, theirs] = isHome
        ? [homeScore, awayScore]
        : [awayScore, homeScore];
      if (mine > theirs) return 'W';
      if (mine < theirs) return 'L';
      return 'D';
    }).join(' ');

    return form;
  } catch (e) {
    console.warn(`[BSD] Forme impossible pour ${teamName}: ${e.message}`);
    return null;
  }
}

// Sync la forme de toutes les équipes en base
async function syncAllTeamForms() {
  const teams = await all(`
    SELECT DISTINCT home_team AS team FROM matches
    UNION
    SELECT DISTINCT away_team AS team FROM matches
  `);

  console.log(`[BSD] Synchro forme pour ${teams.length} équipes...`);

  for (const { team } of teams) {
    const form = await fetchTeamForm(team);
    if (form !== null) {
      await run(`
        INSERT INTO team_stats (team_name, last_5_form, h2h_data)
        VALUES (?, ?, '[]')
        ON CONFLICT(team_name) DO UPDATE SET
          last_5_form = excluded.last_5_form,
          fetched_at  = CURRENT_TIMESTAMP
      `, [team, form]);
      console.log(`[BSD] ${team} : ${form || 'aucun match récent'}`);
    }
    // Petite pause pour ne pas surcharger
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('[BSD] Synchro forme terminée');
}

module.exports = { syncAllTeamForms, fetchTeamForm };