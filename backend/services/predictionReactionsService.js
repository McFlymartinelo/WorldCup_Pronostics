'use strict';
const { run, get, all, exec } = require('../database/db');

const PREDICTION_EMOJIS = ['👍', '🔥', '😂', '🎯', '💪', '😱', '🤡', '🧊'];

async function migratePredictionReactions () {
  await exec(`
    CREATE TABLE IF NOT EXISTS prediction_reactions (
      prediction_id INTEGER NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji         TEXT    NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (prediction_id, user_id, emoji)
    );
    CREATE INDEX IF NOT EXISTS idx_pred_reactions_pred ON prediction_reactions(prediction_id);
  `);
}

function assertEmoji (emoji) {
  if (!PREDICTION_EMOJIS.includes(emoji)) {
    throw Object.assign(new Error('Réaction non autorisée'), { status: 400 });
  }
}

async function getReactionsForPredictions (predictionIds, userId) {
  if (!predictionIds.length) return {};
  const placeholders = predictionIds.map(() => '?').join(',');
  const rows = await all(`
    SELECT r.prediction_id, r.emoji, r.user_id, u.pseudo
    FROM prediction_reactions r
    JOIN users u ON u.id = r.user_id
    WHERE r.prediction_id IN (${placeholders})
    ORDER BY r.prediction_id, r.emoji
  `, predictionIds);

  const byPred = {};
  for (const r of rows) {
    const map = (byPred[r.prediction_id] ||= {});
    if (!map[r.emoji]) {
      map[r.emoji] = { emoji: r.emoji, count: 0, mine: false, users: [] };
    }
    map[r.emoji].count++;
    map[r.emoji].users.push(r.pseudo);
    if (r.user_id === userId) map[r.emoji].mine = true;
  }

  const result = {};
  for (const [pid, map] of Object.entries(byPred)) {
    result[pid] = Object.values(map);
  }
  return result;
}

async function togglePredictionReaction (poolId, userId, predictionId, emoji) {
  assertEmoji(emoji);

  const now = new Date().toISOString();
  const pred = await get(`
    SELECT p.id
    FROM predictions p
    JOIN matches m ON m.id = p.match_id
    WHERE p.id = ? AND p.pool_id = ? AND m.match_date <= ?
  `, [predictionId, poolId, now]);
  if (!pred) {
    throw Object.assign(new Error('Pronostic indisponible'), { status: 404 });
  }

  const existing = await get(
    `SELECT 1 FROM prediction_reactions WHERE prediction_id = ? AND user_id = ? AND emoji = ?`,
    [predictionId, userId, emoji],
  );

  if (existing) {
    await run(
      `DELETE FROM prediction_reactions WHERE prediction_id = ? AND user_id = ? AND emoji = ?`,
      [predictionId, userId, emoji],
    );
    return { toggled: 'off', emoji };
  }

  await run(
    `INSERT INTO prediction_reactions (prediction_id, user_id, emoji) VALUES (?, ?, ?)`,
    [predictionId, userId, emoji],
  );
  return { toggled: 'on', emoji };
}

module.exports = {
  migratePredictionReactions,
  getReactionsForPredictions,
  togglePredictionReaction,
  PREDICTION_EMOJIS,
};
