'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.tmpdir(), `wc-profile-test-${process.pid}.sqlite`);

function freshDb () {
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  delete require.cache[require.resolve('../backend/database/db')];
  process.env.DB_PATH = dbPath;
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  return require('../backend/database/db');
}

describe('pseudo utilisateur', () => {
  let run, get, initDB;

  before(async () => {
    ({ run, get, initDB } = freshDb());
    await initDB();
  });

  after(async () => {
    const { close } = require('../backend/database/db');
    await close();
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    } catch { /* ignore */ }
  });

  it('permet de renommer un joueur si le pseudo est libre', async () => {
    const { lastID: userId } = await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['old_name', 'hash'],
    );
    await run('UPDATE users SET pseudo = ? WHERE id = ?', ['new_name', userId]);
    const row = await get('SELECT pseudo FROM users WHERE id = ?', [userId]);
    assert.equal(row.pseudo, 'new_name');
  });

  it('rejette un pseudo déjà pris (insensible à la casse)', async () => {
    await run(
      `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
      ['Taken', 'hash'],
    );
    let conflict = false;
    try {
      await run(
        `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
        ['taken', 'hash2'],
      );
    } catch (e) {
      conflict = e.message.includes('UNIQUE');
    }
    assert.equal(conflict, true);
  });
});
