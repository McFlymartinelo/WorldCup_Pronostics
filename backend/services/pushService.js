'use strict';
const webpush = require('web-push');
const { all, run } = require('../database/db');

const hasVapid = Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
);

if (hasVapid) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@worldcup.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[push] VAPID non configuré — notifications push désactivées');
}

async function sendPayload (userId, subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      await run('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
      console.log(`[push] Abonnement expiré supprimé (user ${userId})`);
    } else {
      console.error(`[push] Erreur user ${userId}:`, e.message);
    }
  }
}

async function sendToAll (title, body, data = {}) {
  if (!hasVapid) return;

  const subs = await all('SELECT user_id, subscription FROM push_subscriptions');
  console.log(`[push] Envoi "${title}" à ${subs.length} abonnés`);

  for (const row of subs) {
    await sendPayload(row.user_id, JSON.parse(row.subscription), {
      title,
      body,
      icon: '/icon.png',
      badge: '/badge.png',
      data,
    });
  }
}

/** Notifie les membres d'un groupe (sauf excludeUserId). */
async function sendToPoolMembers (poolId, excludeUserId, title, body, data = {}) {
  if (!hasVapid) return;

  const subs = await all(`
    SELECT ps.user_id, ps.subscription
    FROM push_subscriptions ps
    JOIN pool_members pm ON pm.user_id = ps.user_id AND pm.pool_id = ?
    WHERE ps.user_id != ?
  `, [poolId, excludeUserId ?? 0]);

  if (!subs.length) return;
  console.log(`[push] Chat → ${subs.length} membre(s) du groupe ${poolId}`);

  for (const row of subs) {
    await sendPayload(row.user_id, JSON.parse(row.subscription), {
      title,
      body,
      icon: '/icon.png',
      badge: '/badge.png',
      data,
    });
  }
}

async function sendToUser (userId, title, body, data = {}) {
  if (!hasVapid) return;

  const row = await require('../database/db').get(
    'SELECT subscription FROM push_subscriptions WHERE user_id = ?',
    [userId],
  );
  if (!row) return;

  await sendPayload(userId, JSON.parse(row.subscription), {
    title, body, icon: '/icon.png', data,
  });
}

module.exports = { sendToAll, sendToUser, sendToPoolMembers, hasVapid };
