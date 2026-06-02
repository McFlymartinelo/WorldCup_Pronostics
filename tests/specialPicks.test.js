'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.tmpdir(), `wc-special-test-${process.pid}.sqlite`);

function freshDb () {
  for (const mod of [
    '../backend/database/db',
    '../backend/services/poolService',
    '../backend/services/specialPicksService',
  ]) {
    delete require.cache[require.resolve(mod)];
  }
  process.env.DB_PATH = dbPath;
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  return {
    db: require('../backend/database/db'),
    poolService: require('../backend/services/poolService'),
    specialPicks: require('../backend/services/specialPicksService'),
  };
}

describe('specialPicksService', () => {
  let run, get, initDB;
  let registerToPool;
  let groupKey, updateMemberSpecialPicks, setGroupResult, computeSpecialBonus;
  let isGroupPicksLocked, getGroupLocks, POINTS_PER_CORRECT;

  before(async () => {
    const mods = freshDb();
    ({ run, get, initDB } = mods.db);
    ({ registerToPool } = mods.poolService);
    ({
      groupKey,
      updateMemberSpecialPicks,
      setGroupResult,
      computeSpecialBonus,
      isGroupPicksLocked,
      getGroupLocks,
      POINTS_PER_CORRECT,
    } = mods.specialPicks);
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

  it('groupKey distingue 1re et 2e place', () => {
    assert.equal(groupKey('GROUP_A', 1), 'GROUP_A_1ST');
    assert.equal(groupKey('GROUP_A', 2), 'GROUP_A_2ND');
    assert.equal(groupKey('GROUP_A'), 'GROUP_A_2ND');
  });

  it('computeSpecialBonus accorde 1 pt par place correcte', async () => {
    const general = await get('SELECT id FROM pools WHERE invite_code = ?', ['GENERAL']);
    const { lastID: userId } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['specialist', 'hash'],
    );
    await registerToPool(userId, { pool_id: general.id });

    await run(`
      INSERT INTO matches (external_id, home_team, away_team, group_name, match_date, status)
      VALUES ('ga-1', 'France', 'Brazil', 'GROUP_A', datetime('now'), 'SCHEDULED')
    `);

    await updateMemberSpecialPicks(userId, general.id, {
      GROUP_A_1ST: 'France',
      GROUP_A_2ND: 'Brazil',
    });

    await setGroupResult('GROUP_A', 1, 'France');
    await setGroupResult('GROUP_A', 2, 'Brazil');

    const bonus = await computeSpecialBonus(userId, general.id);
    assert.equal(POINTS_PER_CORRECT, 1);
    assert.equal(bonus.points, 2);
    assert.equal(bonus.correct, 2);
  });

  it('isGroupPicksLocked verrouille par groupe indépendamment', async () => {
    await run(`
      INSERT INTO matches (external_id, home_team, away_team, group_name, match_date, status)
      VALUES ('gb-1', 'Spain', 'Germany', 'GROUP_B', datetime('now', '+1 day'), 'SCHEDULED')
    `);
    await run(`
      INSERT INTO matches (external_id, home_team, away_team, group_name, match_date, status, home_score, away_score)
      VALUES ('gc-1', 'Japan', 'Mexico', 'GROUP_C', datetime('now'), 'FINISHED', 1, 0)
    `);

    assert.equal(await isGroupPicksLocked('GROUP_B'), false);
    assert.equal(await isGroupPicksLocked('GROUP_C'), true);

    const locks = await getGroupLocks();
    assert.equal(locks.GROUP_B, false);
    assert.equal(locks.GROUP_C, true);
  });
});
