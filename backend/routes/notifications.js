'use strict';
const express         = require('express');
const { run, get, all } = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/notifications/subscribe
router.post('/subscribe', requireAuth, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'subscription manquante' });

  try {
    await run(`
      INSERT INTO push_subscriptions (user_id, subscription)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        subscription = excluded.subscription,
        updated_at   = CURRENT_TIMESTAMP
    `, [req.user.id, JSON.stringify(subscription)]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/notifications/unsubscribe
router.delete('/unsubscribe', requireAuth, async (req, res) => {
  await run('DELETE FROM push_subscriptions WHERE user_id = ?', [req.user.id]);
  res.json({ success: true });
});

// GET /api/notifications/status
router.get('/status', requireAuth, async (req, res) => {
  const sub = await get(
    'SELECT id FROM push_subscriptions WHERE user_id = ?',
    [req.user.id]
  );
  res.json({ subscribed: !!sub });
});

// GET /api/notifications/vapid-key
router.get('/vapid-key', (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;