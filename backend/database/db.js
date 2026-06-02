'use strict';
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const TURSO_URL = process.env.TURSO_DATABASE_URL?.trim();
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN?.trim();
const USE_TURSO = Boolean(TURSO_URL);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');

/** @type {import('sqlite3').Database | null} */
let db = null;
/** @type {import('@libsql/client').Client | null} */
let tursoClient = null;

function initDriver () {
  if (USE_TURSO) {
    const { createClient } = require('@libsql/client');
    tursoClient = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
    return;
  }

  const sqlite3 = require('sqlite3').verbose();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new sqlite3.Database(DB_PATH);
}

initDriver();

function rowToObject (row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = typeof value === 'bigint' ? Number(value) : value;
  }
  return out;
}

async function run (sql, params = []) {
  if (tursoClient) {
    const result = await tursoClient.execute({ sql, args: params });
    return {
      lastID: Number(result.lastInsertRowid ?? 0),
      changes: result.rowsAffected,
    };
  }

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function all (sql, params = []) {
  if (tursoClient) {
    const result = await tursoClient.execute({ sql, args: params });
    return result.rows.map(rowToObject);
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function get (sql, params = []) {
  if (tursoClient) {
    const result = await tursoClient.execute({ sql, args: params });
    return result.rows[0] ? rowToObject(result.rows[0]) : undefined;
  }

  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function exec (sql) {
  if (tursoClient) {
    await tursoClient.executeMultiple(sql);
    return;
  }

  return new Promise((resolve, reject) => {
    db.exec(sql, err => { if (err) reject(err); else resolve(); });
  });
}

async function close () {
  if (tursoClient) {
    tursoClient.close();
    tursoClient = null;
    return;
  }
  if (!db) return;
  return new Promise((resolve, reject) => {
    db.close(err => {
      db = null;
      if (err) reject(err);
      else resolve();
    });
  });
}

async function initDB () {
  if (!USE_TURSO) {
    await exec(`PRAGMA journal_mode=WAL;`);
  }
  await exec(`
    PRAGMA foreign_keys=ON;

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      pseudo        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'player'
                            CHECK(role IN ('player','admin')),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS matches (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT    UNIQUE NOT NULL,
      home_team   TEXT    NOT NULL,
      away_team   TEXT    NOT NULL,
      match_date  DATETIME NOT NULL,
      status      TEXT    DEFAULT 'SCHEDULED',
      home_score  INTEGER,
      away_score  INTEGER,
      stage       TEXT,
      group_name  TEXT,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS predictions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_id       INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      predicted_home INTEGER NOT NULL,
      predicted_away INTEGER NOT NULL,
      points         INTEGER DEFAULT NULL,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, match_id)
    );
    CREATE TABLE IF NOT EXISTS team_stats (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      team_name   TEXT NOT NULL UNIQUE,
      last_5_form TEXT,
      h2h_data    TEXT,
      fetched_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sync_log (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      job_type TEXT    NOT NULL,
      status   TEXT    NOT NULL,
      message  TEXT,
      ran_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      subscription TEXT    NOT NULL,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS competition_meta (
      id           INTEGER PRIMARY KEY CHECK (id = 1),
      winner_team  TEXT,
      top_scorer   TEXT,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO competition_meta (id) VALUES (1);

    CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
    CREATE INDEX IF NOT EXISTS idx_predictions_user  ON predictions(user_id);
    CREATE INDEX IF NOT EXISTS idx_matches_date      ON matches(match_date);
    CREATE INDEX IF NOT EXISTS idx_matches_status    ON matches(status);
  `);

  const existing = await get('SELECT id FROM users WHERE role = ?', ['admin']);
  if (!existing) {
    const pseudo = process.env.ADMIN_PSEUDO   || 'admin';
    const pass   = process.env.ADMIN_PASSWORD || 'admin123';
    const hash   = bcrypt.hashSync(pass, 10);
    await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'admin')`,
      [pseudo, hash],
    );
    console.log(`👤  Compte admin créé : ${pseudo}`);
  }

  try {
    await run(`ALTER TABLE team_stats ADD COLUMN bsd_team_id INTEGER`);
  } catch { /* colonne déjà existante */ }

  try { await run(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT '⚽'`); } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN color  TEXT DEFAULT '#3b82f6'`); } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN pick_winner TEXT`); } catch {}
  try { await run(`ALTER TABLE users ADD COLUMN pick_top_scorer TEXT`); } catch {}
  try { await run(`ALTER TABLE matches ADD COLUMN kickoff_notified_at DATETIME`); } catch {}

  const { migrateToPools } = require('../services/poolService');
  await migrateToPools();

  console.log(USE_TURSO
    ? '✅  Base Turso initialisée'
    : `✅  Base SQLite initialisée (${DB_PATH})`);
}

module.exports = {
  db,
  tursoClient,
  useTurso: USE_TURSO,
  run,
  get,
  all,
  exec,
  close,
  initDB,
};
