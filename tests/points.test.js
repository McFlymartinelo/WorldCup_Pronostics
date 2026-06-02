'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.tmpdir(), `wc-points-test-${process.pid}.sqlite`);

function freshDb () {
  for (const mod of [
    '../backend/database/db',
    '../backend/services/poolService',
    '../backend/services/footballApi',
    '../backend/services/scoring',
  ]) {
    delete require.cache[require.resolve(mod)];
  }
  process.env.DB_PATH = dbPath;
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  return {
    db: require('../backend/database/db'),
    footballApi: require('../backend/services/footballApi'),
  };
}

describe('computePoints & recalculateAllFinishedMatches', () => {
  let run, get, all, initDB;
  let computePoints, recalculateAllFinishedMatches;

  before(async () => {
    const mods = freshDb();
    ({ run, get, all, initDB } = mods.db);
    ({ computePoints, recalculateAllFinishedMatches } = mods.footballApi);
    await initDB();
  });

  after(async () => {
    const { db } = require('../backend/database/db');
    await new Promise((resolve, reject) => {
      db.close(err => (err ? reject(err) : resolve()));
    });
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    } catch { /* ignore */ }
  });

  it('écrase les points déjà calculés si le barème ou le score change', async () => {
    const general = await get('SELECT id FROM pools WHERE invite_code = ?', ['GENERAL']);
    const { lastID: userId } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['recalc_user', 'hash'],
    );
    await run(
      'INSERT OR IGNORE INTO pool_members (pool_id, user_id, role) VALUES (?, ?, ?)',
      [general.id, userId, 'member'],
    );

    const { lastID: matchId } = await run(`
      INSERT INTO matches (external_id, home_team, away_team, match_date, status, home_score, away_score)
      VALUES ('recalc-1', 'France', 'Brazil', datetime('now'), 'FINISHED', 2, 1)
    `);

    await run(`
      INSERT INTO predictions (user_id, match_id, pool_id, predicted_home, predicted_away, points)
      VALUES (?, ?, ?, 1, 0, 1)
    `, [userId, matchId, general.id]);

    await computePoints(matchId, 2, 1);

    const row = await get(
      'SELECT points FROM predictions WHERE user_id = ? AND match_id = ?',
      [userId, matchId],
    );
    assert.equal(row.points, 2, '1-0 prédit vs 2-1 réel = 2 pts (écart + vainqueur)');
  });

  it('recalculateAllFinishedMatches traite tous les matchs terminés', async () => {
    const general = await get('SELECT id FROM pools WHERE invite_code = ?', ['GENERAL']);
    const { lastID: userId } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['bulk_user', 'hash'],
    );
    await run(
      'INSERT OR IGNORE INTO pool_members (pool_id, user_id, role) VALUES (?, ?, ?)',
      [general.id, userId, 'member'],
    );

    const { lastID: matchId } = await run(`
      INSERT INTO matches (external_id, home_team, away_team, match_date, status, home_score, away_score)
      VALUES ('recalc-2', 'Spain', 'Germany', datetime('now'), 'FINISHED', 0, 0)
    `);

    await run(`
      INSERT INTO predictions (user_id, match_id, pool_id, predicted_home, predicted_away, points)
      VALUES (?, ?, ?, 0, 0, 0)
    `, [userId, matchId, general.id]);

    const before = await get('SELECT points FROM predictions WHERE match_id = ?', [matchId]);
    assert.equal(before.points, 0);

    const stats = await recalculateAllFinishedMatches();
    assert.ok(stats.matches >= 1);
    assert.ok(stats.predictions >= 1);

    const after = await get('SELECT points FROM predictions WHERE match_id = ?', [matchId]);
    assert.equal(after.points, 3);
  });
});
