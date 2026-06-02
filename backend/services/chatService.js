'use strict';
const { run, get, all, exec } = require('../database/db');

const MAX_MESSAGE_LEN = 500;
const MESSAGE_LIMIT = 100;
const ALLOWED_EMOJIS = ['👍', '🔥', '😂', '🎯', '💪', '😱', '❤️', '🏆'];

async function migrateChatTables () {
  await exec(`
    CREATE TABLE IF NOT EXISTS pool_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_id    INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content    TEXT    NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS message_reactions (
      message_id INTEGER NOT NULL REFERENCES pool_messages(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji      TEXT    NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (message_id, user_id, emoji)
    );

    CREATE INDEX IF NOT EXISTS idx_pool_messages_pool ON pool_messages(pool_id, id);
    CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON message_reactions(message_id);
  `);
}

function assertEmoji (emoji) {
  if (!ALLOWED_EMOJIS.includes(emoji)) {
    throw Object.assign(new Error('Réaction non autorisée'), { status: 400 });
  }
}

async function getPoolMessages (poolId, userId, { after = 0, limit = MESSAGE_LIMIT } = {}) {
  const afterId = Math.max(0, parseInt(after, 10) || 0);
  const cap = Math.min(Math.max(1, parseInt(limit, 10) || MESSAGE_LIMIT), MESSAGE_LIMIT);

  const messages = await all(`
    SELECT m.id, m.pool_id, m.user_id, m.content, m.created_at,
           u.pseudo, u.avatar, u.color
    FROM pool_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.pool_id = ? AND m.id > ?
    ORDER BY m.id ASC
    LIMIT ?
  `, [poolId, afterId, cap]);

  if (!messages.length) return [];

  const ids = messages.map(m => m.id);
  const placeholders = ids.map(() => '?').join(',');

  const reactions = await all(`
    SELECT r.message_id, r.emoji, r.user_id, u.pseudo
    FROM message_reactions r
    JOIN users u ON u.id = r.user_id
    WHERE r.message_id IN (${placeholders})
    ORDER BY r.message_id, r.emoji
  `, ids);

  const byMessage = {};
  for (const r of reactions) {
    if (!byMessage[r.message_id]) byMessage[r.message_id] = [];
    byMessage[r.message_id].push(r);
  }

  return messages.map(m => ({
    id: m.id,
    user_id: m.user_id,
    pseudo: m.pseudo,
    avatar: m.avatar || '⚽',
    color: m.color || '#3b82f6',
    content: m.content,
    created_at: m.created_at,
    mine: m.user_id === userId,
    reactions: formatReactions(byMessage[m.id] || [], userId),
  }));
}

function formatReactions (rows, userId) {
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { emoji: r.emoji, count: 0, mine: false, users: [] };
    }
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.pseudo);
    if (r.user_id === userId) grouped[r.emoji].mine = true;
  }
  return Object.values(grouped);
}

async function postPoolMessage (poolId, userId, content) {
  const text = (content || '').trim();
  if (!text) {
    throw Object.assign(new Error('Message vide'), { status: 400 });
  }
  if (text.length > MAX_MESSAGE_LEN) {
    throw Object.assign(new Error(`Message trop long (max ${MAX_MESSAGE_LEN} caractères)`), { status: 400 });
  }

  const { lastID } = await run(
    `INSERT INTO pool_messages (pool_id, user_id, content) VALUES (?, ?, ?)`,
    [poolId, userId, text],
  );

  const rows = await getPoolMessages(poolId, userId, { after: lastID - 1, limit: 1 });
  return rows[0];
}

async function toggleReaction (poolId, userId, messageId, emoji) {
  assertEmoji(emoji);

  const msg = await get(
    `SELECT id FROM pool_messages WHERE id = ? AND pool_id = ?`,
    [messageId, poolId],
  );
  if (!msg) {
    throw Object.assign(new Error('Message introuvable'), { status: 404 });
  }

  const existing = await get(
    `SELECT 1 FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
    [messageId, userId, emoji],
  );

  if (existing) {
    await run(
      `DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
      [messageId, userId, emoji],
    );
    return { toggled: 'off', emoji };
  }

  await run(
    `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)`,
    [messageId, userId, emoji],
  );
  return { toggled: 'on', emoji };
}

async function notifyNewChatMessage (poolId, senderUserId, message) {
  const { sendToPoolMembers, hasVapid } = require('./pushService');
  if (!hasVapid || !message) return;

  const pool = await get('SELECT name FROM pools WHERE id = ?', [poolId]);
  const preview = message.content.length > 120
    ? `${message.content.slice(0, 117)}…`
    : message.content;

  await sendToPoolMembers(
    poolId,
    senderUserId,
    `💬 ${pool?.name || 'Groupe'}`,
    `${message.pseudo}: ${preview}`,
    { type: 'chat', poolId, messageId: message.id },
  );
}

module.exports = {
  migrateChatTables,
  getPoolMessages,
  postPoolMessage,
  toggleReaction,
  notifyNewChatMessage,
  ALLOWED_EMOJIS,
  MAX_MESSAGE_LEN,
};
