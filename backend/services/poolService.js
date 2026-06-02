'use strict';
const { run, get, all, exec } = require('../database/db');

const GENERAL_CODE = 'GENERAL';

function generateInviteCode () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueInviteCode () {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateInviteCode();
    const exists = await get('SELECT id FROM pools WHERE invite_code = ?', [code]);
    if (!exists) return code;
  }
  throw new Error('Impossible de générer un code d\'invitation');
}

async function getGeneralPoolId () {
  const row = await get('SELECT id FROM pools WHERE invite_code = ?', [GENERAL_CODE]);
  return row?.id ?? null;
}

async function ensureGeneralPool () {
  let pool = await get('SELECT id FROM pools WHERE invite_code = ?', [GENERAL_CODE]);
  if (pool) return pool.id;

  const admin = await get('SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1', ['admin']);
  const { lastID } = await run(
    `INSERT INTO pools (name, invite_code, created_by) VALUES (?, ?, ?)`,
    ['Général', GENERAL_CODE, admin?.id ?? null],
  );
  return lastID;
}

async function migrateToPools () {
  await exec(`
    CREATE TABLE IF NOT EXISTS pools (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      invite_code TEXT    NOT NULL UNIQUE,
      is_public   INTEGER NOT NULL DEFAULT 0,
      created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pool_members (
      pool_id         INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role            TEXT    NOT NULL DEFAULT 'member'
                              CHECK(role IN ('owner', 'member')),
      pick_winner     TEXT,
      pick_top_scorer TEXT,
      joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (pool_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_pool_members_user ON pool_members(user_id);
  `);

  const predCols = await all('PRAGMA table_info(predictions)');
  const hasPoolId = predCols.some(c => c.name === 'pool_id');

  const generalId = await ensureGeneralPool();

  if (!hasPoolId) {
    await exec(`
      CREATE TABLE predictions_new (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        match_id       INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        pool_id        INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
        predicted_home INTEGER NOT NULL,
        predicted_away INTEGER NOT NULL,
        points         INTEGER DEFAULT NULL,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, match_id, pool_id)
      );
    `);

    await run(`
      INSERT INTO predictions_new
        (id, user_id, match_id, pool_id, predicted_home, predicted_away, points, created_at, updated_at)
      SELECT id, user_id, match_id, ?, predicted_home, predicted_away, points, created_at, updated_at
      FROM predictions
    `, [generalId]);

    await exec(`
      DROP TABLE predictions;
      ALTER TABLE predictions_new RENAME TO predictions;
      CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
      CREATE INDEX IF NOT EXISTS idx_predictions_user  ON predictions(user_id);
      CREATE INDEX IF NOT EXISTS idx_predictions_pool  ON predictions(pool_id);
    `);

    console.log('[pools] predictions migrées vers le groupe Général');
  }

  const users = await all('SELECT id, pick_winner, pick_top_scorer FROM users');
  for (const u of users) {
    await run(
      `INSERT OR IGNORE INTO pool_members (pool_id, user_id, role, pick_winner, pick_top_scorer)
       VALUES (?, ?, 'member', ?, ?)`,
      [generalId, u.id, u.pick_winner ?? null, u.pick_top_scorer ?? null],
    );
  }

  const owners = await all(`
    SELECT p.id FROM pools p
    LEFT JOIN pool_members pm ON pm.pool_id = p.id AND pm.role = 'owner'
    WHERE pm.user_id IS NULL AND p.created_by IS NOT NULL
  `);
  for (const p of owners) {
    await run(
      `INSERT OR IGNORE INTO pool_members (pool_id, user_id, role)
       VALUES (?, (SELECT created_by FROM pools WHERE id = ?), 'owner')`,
      [p.id, p.id],
    );
  }

  try { await run('ALTER TABLE pools ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0'); } catch { /* existe */ }
  await run('UPDATE pools SET is_public = 1 WHERE invite_code = ?', [GENERAL_CODE]);

  const { migrateChatTables } = require('./chatService');
  await migrateChatTables();
}

async function addUserToPool (userId, poolId) {
  await run(
    `INSERT OR IGNORE INTO pool_members (pool_id, user_id, role) VALUES (?, ?, 'member')`,
    [poolId, userId],
  );
  return poolId;
}

async function addUserToGeneralPool (userId) {
  const generalId = await ensureGeneralPool();
  await addUserToPool(userId, generalId);
  return generalId;
}

async function getPublicPools () {
  return all(`
    SELECT id, name,
           (SELECT COUNT(*) FROM pool_members WHERE pool_id = pools.id) AS member_count
    FROM pools
    WHERE is_public = 1
    ORDER BY name COLLATE NOCASE ASC
  `);
}

async function joinPublicPool (userId, poolId) {
  const id = parseInt(poolId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error('Groupe invalide'), { status: 400 });
  }

  const pool = await get('SELECT id, name FROM pools WHERE id = ? AND is_public = 1', [id]);
  if (!pool) {
    throw Object.assign(new Error('Groupe public introuvable'), { status: 404 });
  }

  if (await isPoolMember(userId, pool.id)) {
    return { id: pool.id, name: pool.name };
  }

  await addUserToPool(userId, pool.id);
  return { id: pool.id, name: pool.name };
}

/** Inscription : rejoindre via groupe public ou code privé. */
async function registerToPool (userId, { pool_id, invite_code }) {
  if (invite_code) {
    const pool = await joinPool(userId, invite_code);
    return pool.id;
  }
  if (pool_id != null) {
    const pool = await joinPublicPool(userId, pool_id);
    return pool.id;
  }
  throw Object.assign(
    new Error('Choisissez un groupe ou saisissez un code d\'accès'),
    { status: 400 },
  );
}

async function isPoolMember (userId, poolId) {
  const row = await get(
    'SELECT 1 FROM pool_members WHERE pool_id = ? AND user_id = ?',
    [poolId, userId],
  );
  return !!row;
}

async function getUserPools (userId) {
  return all(`
    SELECT p.id, p.name, p.invite_code, pm.role,
           (SELECT COUNT(*) FROM pool_members WHERE pool_id = p.id) AS member_count
    FROM pools p
    JOIN pool_members pm ON pm.pool_id = p.id AND pm.user_id = ?
    ORDER BY p.name COLLATE NOCASE ASC
  `, [userId]);
}

async function getPoolMembers (poolId) {
  return all(`
    SELECT u.id, u.pseudo, u.avatar, u.color, pm.role, pm.joined_at
    FROM pool_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.pool_id = ?
    ORDER BY pm.role DESC, u.pseudo COLLATE NOCASE ASC
  `, [poolId]);
}

async function createPool (userId, name) {
  const trimmed = (name || '').trim();
  if (trimmed.length < 2 || trimmed.length > 40) {
    throw Object.assign(new Error('Nom du groupe : 2 à 40 caractères'), { status: 400 });
  }

  const inviteCode = await uniqueInviteCode();
  const { lastID: poolId } = await run(
    `INSERT INTO pools (name, invite_code, created_by) VALUES (?, ?, ?)`,
    [trimmed, inviteCode, userId],
  );

  await run(
    `INSERT INTO pool_members (pool_id, user_id, role) VALUES (?, ?, 'owner')`,
    [poolId, userId],
  );

  return {
    id: poolId,
    name: trimmed,
    invite_code: inviteCode,
    role: 'owner',
    member_count: 1,
  };
}

async function joinPool (userId, inviteCode) {
  const code = (inviteCode || '').trim().toUpperCase();
  if (!code) {
    throw Object.assign(new Error('Code d\'invitation requis'), { status: 400 });
  }

  const pool = await get('SELECT id, name, invite_code FROM pools WHERE invite_code = ?', [code]);
  if (!pool) {
    throw Object.assign(new Error('Code d\'invitation invalide'), { status: 404 });
  }

  const already = await isPoolMember(userId, pool.id);
  if (already) {
    throw Object.assign(new Error('Vous êtes déjà dans ce groupe'), { status: 409 });
  }

  await run(
    `INSERT INTO pool_members (pool_id, user_id, role) VALUES (?, ?, 'member')`,
    [pool.id, userId],
  );

  const memberCount = await get(
    'SELECT COUNT(*) AS n FROM pool_members WHERE pool_id = ?',
    [pool.id],
  );

  return {
    id: pool.id,
    name: pool.name,
    invite_code: pool.invite_code,
    role: 'member',
    member_count: memberCount?.n ?? 1,
  };
}

async function getMemberPicks (userId, poolId) {
  return get(
    `SELECT pick_winner, pick_top_scorer, role
     FROM pool_members WHERE pool_id = ? AND user_id = ?`,
    [poolId, userId],
  );
}

async function updateMemberPicks (userId, poolId, pickWinner, pickTopScorer) {
  const sets = [];
  const params = [];

  if (pickWinner !== undefined) {
    sets.push('pick_winner = ?');
    params.push(pickWinner || null);
  }
  if (pickTopScorer !== undefined) {
    sets.push('pick_top_scorer = ?');
    params.push(pickTopScorer || null);
  }

  if (!sets.length) return;

  params.push(poolId, userId);
  await run(
    `UPDATE pool_members SET ${sets.join(', ')} WHERE pool_id = ? AND user_id = ?`,
    params,
  );
}

module.exports = {
  migrateToPools,
  addUserToPool,
  addUserToGeneralPool,
  getGeneralPoolId,
  getPublicPools,
  registerToPool,
  isPoolMember,
  getUserPools,
  getPoolMembers,
  createPool,
  joinPool,
  getMemberPicks,
  updateMemberPicks,
  GENERAL_CODE,
};
