'use strict';
const express           = require('express');
const { requireAuth }   = require('../middleware/auth');
const { run, get, all } = require('../database/db');
const fetch             = require('node-fetch');

const router  = express.Router();
const BASE    = 'https://sports.bzzoiro.com/api/v2';
const headers = { 'Authorization': `Token ${process.env.BSD_API_KEY}` };
const { MANUAL_TEAM_MAP } = require('../data/competitionTeams');

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`BSD ${res.status}: ${path}`);
  return res.json();
}

// Cache global : { teamId: [players] }
let globalSquads   = null;
let globalSquadsTs = 0;

async function loadAllSquads() {
  if (globalSquads && Date.now() - globalSquadsTs < 3600000) return globalSquads;

  console.log('[squads] Chargement de tous les joueurs CdM...');
  let allPlayers = [];
  let offset = 0;

  while (true) {
    const data = await apiFetch(`/worldcup/squads/?limit=200&offset=${offset}`);
    const results = data.results || [];
    allPlayers = allPlayers.concat(results);
    console.log(`[squads] ${allPlayers.length}/${data.count}`);
    if (!data.next || results.length === 0) break;
    offset += 200;
  }

  // Groupe par team_id, officiels seulement
  const byTeamId = {};
  for (const p of allPlayers) {
    if (p.status !== 'official') continue;
    if (!byTeamId[p.team_id]) byTeamId[p.team_id] = [];
    byTeamId[p.team_id].push(p);
  }

  console.log(`[squads] ${Object.keys(byTeamId).length} équipes, ${allPlayers.length} joueurs`);
  globalSquads   = byTeamId;
  globalSquadsTs = Date.now();

  // Log temporaire
  for (const [teamId, players] of Object.entries(byTeamId)) {
    const countryCount = {};
    for (const p of players) {
      const cc = p.club_country || 'unknown';
      countryCount[cc] = (countryCount[cc] || 0) + 1;
    }
    const topCountry = Object.entries(countryCount).sort((a,b) => b[1]-a[1])[0];
    console.log(`team_id ${teamId}: ${players.length} joueurs, dominant: ${topCountry?.[0]} (${topCountry?.[1]})`);
  }

  return byTeamId;
}

function sortPlayers(players) {
  const posOrder = { GK: 0, DF: 1, DEF: 1, MID: 2, MF: 2, FW: 3, ATT: 3 };
  return [...players].sort((a, b) => {
    const pa = posOrder[a.position] ?? 9;
    const pb = posOrder[b.position] ?? 9;
    if (pa !== pb) return pa - pb;
    return (a.jersey_number || 99) - (b.jersey_number || 99);
  });
}

// Fonction exportée pour admin.js
async function syncSquads() {
  const squads = await loadAllSquads();

  // Assure une entrée team_stats pour chaque nation du mapping
  for (const team_name of Object.keys(MANUAL_TEAM_MAP)) {
    await run(
      `INSERT INTO team_stats (team_name, last_5_form, h2h_data)
       VALUES (?, '', '[]')
       ON CONFLICT(team_name) DO NOTHING`,
      [team_name]
    );
  }

  const teamStats = await all('SELECT team_name FROM team_stats');
  let matched = 0;

  // Log des team_ids disponibles pour debug
  console.log('[squads] team_ids disponibles:', Object.keys(squads).join(', '));

  for (const { team_name } of teamStats) {
    // Cherche dans le mapping manuel
    const manualId = MANUAL_TEAM_MAP[team_name];

    if (manualId && squads[manualId]) {
      await run(
        'UPDATE team_stats SET bsd_team_id = ? WHERE team_name = ?',
        [manualId, team_name]
      );
      console.log(`[squads] ✓ ${team_name} → team_id ${manualId} (${squads[manualId].length} joueurs)`);
      matched++;
    } else if (manualId === null) {
      console.log(`[squads] ✗ ${team_name} → pas encore dans le mapping`);
    } else {
      // Fallback automatique par club_country
      let bestId = null, bestCount = 0;
      for (const [teamId, players] of Object.entries(squads)) {
        const count = players.filter(p =>
          p.club_country?.toLowerCase() === team_name.toLowerCase()
        ).length;
        if (count > bestCount) { bestCount = count; bestId = teamId; }
      }
      if (bestId && bestCount >= 3) {
        await run(
          'UPDATE team_stats SET bsd_team_id = ? WHERE team_name = ?',
          [parseInt(bestId), team_name]
        );
        console.log(`[squads] ~ ${team_name} → team_id ${bestId} auto (${bestCount} joueurs)`);
        matched++;
      } else {
        console.log(`[squads] ✗ ${team_name} → non mappé`);
      }
    }
  }

  console.log(`[squads] ${matched}/${teamStats.length} équipes mappées`);
  return matched;
}

// POST /api/squads/sync
router.post('/sync', requireAuth, async (_req, res) => {
  try {
    const matched = await syncSquads();
    res.json({ success: true, matched });
  } catch (e) {
    console.error('[squads sync]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/squads/:teamName
router.get('/:teamName', requireAuth, async (req, res) => {
  const teamName = decodeURIComponent(req.params.teamName);

  try {
    const stat = await get(
      'SELECT bsd_team_id FROM team_stats WHERE LOWER(team_name) = LOWER(?)',
      [teamName]
    );

    const squads = await loadAllSquads();
    let players  = [];

    if (stat?.bsd_team_id && squads[stat.bsd_team_id]) {
      players = squads[stat.bsd_team_id];
      console.log(`[squads] ${teamName} (team_id ${stat.bsd_team_id}): ${players.length} joueurs`);
    } else {
      // Fallback club_country
      let bestId = null, bestCount = 0;
      for (const [teamId, ps] of Object.entries(squads)) {
        const count = ps.filter(p =>
          p.club_country?.toLowerCase() === teamName.toLowerCase()
        ).length;
        if (count > bestCount) { bestCount = count; bestId = teamId; }
      }
      if (bestId && bestCount >= 2) {
        players = squads[bestId];
        await run(
          'UPDATE team_stats SET bsd_team_id = ? WHERE LOWER(team_name) = LOWER(?)',
          [parseInt(bestId), teamName]
        );
        console.log(`[squads] ${teamName} fallback → team_id ${bestId}: ${players.length} joueurs`);
      }
    }

    res.json({ teamName, squad: sortPlayers(players) });

  } catch (e) {
    console.error('[squads]', e.message);
    res.status(500).json({ error: e.message, squad: [] });
  }
});

async function getAllScorerNames () {
  const squads = await loadAllSquads();
  const names = new Set();
  for (const players of Object.values(squads)) {
    for (const p of players) {
      if (p.name) names.add(p.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
}

module.exports = router;
module.exports.syncSquads = syncSquads;
module.exports.getAllScorerNames = getAllScorerNames;