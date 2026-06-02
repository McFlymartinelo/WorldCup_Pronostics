'use strict';
const fetch        = require('node-fetch');
const { run, get, all } = require('../database/db');
const { scorePrediction } = require('./scoring');

const BASE = process.env.FOOTBALL_API_BASE_URL || 'https://api.football-data.org/v4';
const KEY  = process.env.FOOTBALL_API_KEY;
const CODE = process.env.COMPETITION_CODE || 'WC';

const headers = { 'X-Auth-Token': KEY };

async function apiFetch (path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`API Football ${res.status}: ${path}`);
  return res.json();
}

async function syncFixtures () {
  const data = await apiFetch(`/competitions/${CODE}/matches`);
  const matches = data.matches || [];
  
  let inserted = 0, skipped = 0;

  for (const m of matches) {
    const homeName = m.homeTeam?.name ?? m.homeTeam?.shortName ?? null;
    const awayName = m.awayTeam?.name ?? m.awayTeam?.shortName ?? null;

    if (!homeName || !awayName || homeName === 'TBD' || awayName === 'TBD') {
      skipped++;
      continue;
    }

    try {
      await run(`
        INSERT INTO matches (external_id, home_team, away_team, match_date, status, stage, group_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(external_id) DO UPDATE SET
          status     = excluded.status,
          match_date = excluded.match_date,
          updated_at = CURRENT_TIMESTAMP
      `, [
        String(m.id),
        homeName,
        awayName,
        m.utcDate,
        m.status,
        m.stage,
        m.group ?? null
      ]);
      inserted++;
    } catch (e) {
      console.error(`[fixtures] Erreur match ${m.id}:`, e.message, '| home:', homeName, '| away:', awayName);
    }

    await syncTeamForm(m.homeTeam?.id, homeName);
    await syncTeamForm(m.awayTeam?.id, awayName);
  }

  await log('fixtures', 'ok', `${inserted} insérés, ${skipped} ignorés`);
  console.log(`[fixtures] ${inserted} matchs insérés, ${skipped} ignorés`);
}

async function syncTeamForm (teamId, teamName) {
  try {
    // Calcule la forme depuis les matchs déjà synchronisés en base
    const matches = await all(`
      SELECT home_team, away_team, home_score, away_score
      FROM matches
      WHERE (home_team = ? OR away_team = ?)
        AND status = 'FINISHED'
        AND home_score IS NOT NULL
      ORDER BY match_date DESC
      LIMIT 5
    `, [teamName, teamName]);

    if (matches.length === 0) {
      // Pas encore de matchs en base, on met une forme vide
      await run(`
        INSERT INTO team_stats (team_name, last_5_form, h2h_data)
        VALUES (?, ?, '[]')
        ON CONFLICT(team_name) DO UPDATE SET
          last_5_form = excluded.last_5_form,
          fetched_at  = CURRENT_TIMESTAMP
      `, [teamName, '']);
      return;
    }

    const form = matches.map(m => {
      const isHome = m.home_team === teamName;
      const [mine, theirs] = isHome
        ? [m.home_score, m.away_score]
        : [m.away_score, m.home_score];
      if (mine > theirs) return 'W';
      if (mine < theirs) return 'L';
      return 'D';
    }).join(' ');

    await run(`
      INSERT INTO team_stats (team_name, last_5_form, h2h_data)
      VALUES (?, ?, '[]')
      ON CONFLICT(team_name) DO UPDATE SET
        last_5_form = excluded.last_5_form,
        fetched_at  = CURRENT_TIMESTAMP
    `, [teamName, form]);

    console.log(`[form] ${teamName} : ${form || 'pas encore de matchs'}`);
  } catch (e) {
    console.warn(`[form] Erreur pour ${teamName}: ${e.message}`);
  }
}

function extractForm (matches, teamId) {
  return (matches || []).map(m => {
    const isHome = m.homeTeam.id === teamId;
    const gs = m.score?.fullTime;
    if (!gs) return '?';
    const [mine, theirs] = isHome ? [gs.home, gs.away] : [gs.away, gs.home];
    if (mine > theirs) return 'W';
    if (mine < theirs) return 'L';
    return 'D';
  }).join(' ');
}

async function syncScores () {
  const data = await apiFetch(`/competitions/${CODE}/matches?status=FINISHED`);
  const matches = data.matches || [];

  for (const m of matches) {
    const score = m.score?.fullTime;
    if (score?.home == null || score?.away == null) continue;

    await run(`
      UPDATE matches
      SET home_score = ?, away_score = ?, status = 'FINISHED', updated_at = CURRENT_TIMESTAMP
      WHERE external_id = ?
    `, [score.home, score.away, String(m.id)]);

    const dbMatch = await get('SELECT id FROM matches WHERE external_id = ?', [String(m.id)]);
    if (dbMatch) await computePoints(dbMatch.id, score.home, score.away);
  }

  await log('scores', 'ok', `${matches.length} scores mis à jour`);
  console.log(`[scores] ${matches.length} scores mis à jour`);
}

async function computePoints (matchId, realHome, realAway) {
  const predictions = await all(
    'SELECT id, predicted_home, predicted_away FROM predictions WHERE match_id = ? AND points IS NULL',
    [matchId]
  );

  for (const p of predictions) {
    const pts = scorePrediction(p.predicted_home, p.predicted_away, realHome, realAway);
    await run(
      'UPDATE predictions SET points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [pts, p.id]
    );
  }
}

async function log (jobType, status, message) {
  await run(
    `INSERT INTO sync_log (job_type, status, message) VALUES (?, ?, ?)`,
    [jobType, status, message]
  );
}

module.exports = { syncFixtures, syncScores, computePoints };