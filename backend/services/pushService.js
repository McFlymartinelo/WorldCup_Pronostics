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

async function sendToAll (title, body, data = {}) {
  if (!hasVapid) return;

  const subs = await all('SELECT user_id, subscription FROM push_subscriptions');
  console.log(`[push] Envoi "${title}" à ${subs.length} abonnés`);

  for (const row of subs) {
    try {
      const subscription = JSON.parse(row.subscription);
      await webpush.sendNotification(subscription, JSON.stringify({
        title,
        body,
        icon:  '/icon.png',
        badge: '/badge.png',
        data,
      }));
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        await run('DELETE FROM push_subscriptions WHERE user_id = ?', [row.user_id]);
        console.log(`[push] Abonnement expiré supprimé (user ${row.user_id})`);
      } else {
        console.error(`[push] Erreur user ${row.user_id}:`, e.message);
      }
    }
  }
}

async function sendToUser (userId, title, body, data = {}) {
  if (!hasVapid) return;

  const row = await require('../database/db').get(
    'SELECT subscription FROM push_subscriptions WHERE user_id = ?',
    [userId]
  );
  if (!row) return;

  try {
    await webpush.sendNotification(JSON.parse(row.subscription), JSON.stringify({
      title, body, icon: '/icon.png', data,
    }));
  } catch (e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      await run('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
    }
  }
}

module.exports = { sendToAll, sendToUser, hasVapid };
