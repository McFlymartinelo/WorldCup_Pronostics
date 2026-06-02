'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.tmpdir(), `wc-pools-test-${process.pid}.sqlite`);

function freshDb () {
  delete require.cache[require.resolve('../backend/database/db')];
  delete require.cache[require.resolve('../backend/services/poolService')];
  delete require.cache[require.resolve('../backend/services/footballApi')];
  delete require.cache[require.resolve('../backend/services/scoring')];
  process.env.DB_PATH = dbPath;
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  return {
    db: require('../backend/database/db'),
    poolService: require('../backend/services/poolService'),
    footballApi: require('../backend/services/footballApi'),
  };
}

describe('pools & predictions', () => {
  let run, get, all, initDB;
  let createPool, joinPool, registerToPool, computePoints;

  before(async () => {
    const mods = freshDb();
    ({ run, get, all, initDB } = mods.db);
    ({ createPool, joinPool, registerToPool } = mods.poolService);
    ({ computePoints } = mods.footballApi);
    await initDB();
  });

  after(async () => {
    const { db } = require('../backend/database/db');
    await new Promise((resolve, reject) => {
      db.close(err => (err ? reject(err) : resolve()));
    });
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    } catch { /* Windows peut garder le fichier un instant */ }
  });

  it('crée un groupe avec code d\'invitation unique', async () => {
    const { lastID: userId } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['owner1', 'hash'],
    );
    const pool = await createPool(userId, 'Les potes');
    assert.ok(pool.id);
    assert.match(pool.invite_code, /^[A-Z0-9]{6}$/);
  });

  it('permet de rejoindre un groupe par code', async () => {
    const { lastID: ownerId } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['owner2', 'hash'],
    );
    const { lastID: memberId } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['member2', 'hash'],
    );
    const pool = await createPool(ownerId, 'Famille');
    const joined = await joinPool(memberId, pool.invite_code);
    assert.equal(joined.id, pool.id);

    const member = await get(
      'SELECT 1 AS ok FROM pool_members WHERE pool_id = ? AND user_id = ?',
      [pool.id, memberId],
    );
    assert.ok(member);
  });

  it('inscrit un joueur via registerToPool (pool_id public)', async () => {
    const generalId = await get('SELECT id FROM pools WHERE invite_code = ?', ['GENERAL']);
    const { lastID: userId } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['newbie', 'hash'],
    );
    const poolId = await registerToPool(userId, { pool_id: generalId.id });
    assert.equal(poolId, generalId.id);
  });

  it('isole les pronostics par groupe (ON CONFLICT pool_id)', async () => {
    const { lastID: u1 } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['preduser', 'hash'],
    );
    const p1 = await createPool(u1, 'Pool A');
    const p2 = await createPool(u1, 'Pool B');

    const { lastID: matchId } = await run(`
      INSERT INTO matches (external_id, home_team, away_team, match_date, status, home_score, away_score)
      VALUES ('test-1', 'France', 'Brazil', datetime('now'), 'FINISHED', 2, 1)
    `);

    await run(`
      INSERT INTO predictions (user_id, match_id, pool_id, predicted_home, predicted_away, points)
      VALUES (?, ?, ?, 2, 1, 3)
    `, [u1, matchId, p1.id]);

    await run(`
      INSERT INTO predictions (user_id, match_id, pool_id, predicted_home, predicted_away, points)
      VALUES (?, ?, ?, 0, 0, 0)
    `, [u1, matchId, p2.id]);

    const preds = await all(
      'SELECT pool_id, predicted_home, predicted_away, points FROM predictions WHERE user_id = ? AND match_id = ? ORDER BY pool_id',
      [u1, matchId],
    );
    assert.equal(preds.length, 2);
    assert.equal(preds[0].points, 3);
    assert.equal(preds[1].points, 0);
  });

  it('recalcule les points via computePoints pour tous les pronos NULL', async () => {
    const { lastID: u2 } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['scorer', 'hash'],
    );
    const general = await get('SELECT id FROM pools WHERE invite_code = ?', ['GENERAL']);
    await run(
      'INSERT OR IGNORE INTO pool_members (pool_id, user_id, role) VALUES (?, ?, ?)',
      [general.id, u2, 'member'],
    );

    const { lastID: matchId } = await run(`
      INSERT INTO matches (external_id, home_team, away_team, match_date, status, home_score, away_score)
      VALUES ('test-2', 'Spain', 'Germany', datetime('now'), 'FINISHED', 1, 1)
    `);

    await run(`
      INSERT INTO predictions (user_id, match_id, pool_id, predicted_home, predicted_away)
      VALUES (?, ?, ?, 1, 1)
    `, [u2, matchId, general.id]);

    await computePoints(matchId, 1, 1);

    const row = await get(
      'SELECT points FROM predictions WHERE user_id = ? AND match_id = ? AND pool_id = ?',
      [u2, matchId, general.id],
    );
    assert.equal(row.points, 3);
  });
});
