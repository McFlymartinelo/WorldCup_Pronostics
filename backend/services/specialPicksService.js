'use strict';
const { run, get, all, exec } = require('../database/db');

const POINTS_PER_CORRECT = 2;

async function migrateSpecialPicks () {
  try {
    await run(`ALTER TABLE pool_members ADD COLUMN special_picks TEXT NOT NULL DEFAULT '{}'`);
  } catch { /* existe */ }

  await exec(`
    CREATE TABLE IF NOT EXISTS group_stage_results (
      group_name  TEXT    NOT NULL,
      position    INTEGER NOT NULL CHECK(position IN (1, 2)),
      team_name   TEXT    NOT NULL,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_name, position)
    );
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS prediction_reminders (
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_id  INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      pool_id   INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      sent_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, match_id, pool_id)
    );
  `);
}

function parsePicks (raw) {
  try {
    const o = JSON.parse(raw || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function groupKey (groupName) {
  return `${groupName}_2ND`;
}

async function getGroupList () {
  const rows = await all(`
    SELECT DISTINCT group_name FROM matches
    WHERE group_name IS NOT NULL AND group_name != ''
    ORDER BY group_name COLLATE NOCASE ASC
  `);
  return rows.map(r => r.group_name);
}

async function getTeamsInGroup (groupName) {
  const matches = await all(
    'SELECT home_team, away_team FROM matches WHERE group_name = ?',
    [groupName],
  );
  const teams = new Set();
  for (const m of matches) {
    if (m.home_team) teams.add(m.home_team);
    if (m.away_team) teams.add(m.away_team);
  }
  return [...teams].sort((a, b) => a.localeCompare(b, 'fr'));
}

async function getMemberSpecialPicks (userId, poolId) {
  const row = await get(
    'SELECT special_picks FROM pool_members WHERE user_id = ? AND pool_id = ?',
    [userId, poolId],
  );
  return parsePicks(row?.special_picks);
}

async function updateMemberSpecialPicks (userId, poolId, picks) {
  const groups = await getGroupList();
  const cleaned = {};
  for (const g of groups) {
    const key = groupKey(g);
    if (picks[key] !== undefined && picks[key] !== null && picks[key] !== '') {
      cleaned[key] = picks[key];
    }
  }
  await run(
    'UPDATE pool_members SET special_picks = ? WHERE user_id = ? AND pool_id = ?',
    [JSON.stringify(cleaned), userId, poolId],
  );
  return cleaned;
}

async function getGroupResults () {
  return all('SELECT group_name, position, team_name FROM group_stage_results ORDER BY group_name, position');
}

async function setGroupResult (groupName, position, teamName) {
  await run(`
    INSERT INTO group_stage_results (group_name, position, team_name, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(group_name, position) DO UPDATE SET
      team_name = excluded.team_name,
      updated_at = CURRENT_TIMESTAMP
  `, [groupName, position, teamName || null]);
}

async function computeSpecialBonus (userId, poolId) {
  const picks = await getMemberSpecialPicks(userId, poolId);
  const seconds = await all(
    'SELECT group_name, team_name FROM group_stage_results WHERE position = 2 AND team_name IS NOT NULL',
  );
  let pts = 0;
  let correct = 0;
  for (const r of seconds) {
    if (picks[groupKey(r.group_name)] === r.team_name) {
      pts += POINTS_PER_CORRECT;
      correct += 1;
    }
  }
  return { points: pts, correct };
}

module.exports = {
  migrateSpecialPicks,
  getGroupList,
  getTeamsInGroup,
  getMemberSpecialPicks,
  updateMemberSpecialPicks,
  getGroupResults,
  setGroupResult,
  computeSpecialBonus,
  groupKey,
  POINTS_PER_CORRECT,
};
