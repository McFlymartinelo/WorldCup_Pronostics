'use strict';
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getUserPools,
  getPoolMembers,
  createPool,
  joinPool,
  isPoolMember,
} = require('../services/poolService');

const router = express.Router();

// GET /api/pools/public — groupes ouverts à l'inscription (sans auth)
router.get('/public', async (_req, res) => {
  try {
    const { getPublicPools } = require('../services/poolService');
    const pools = await getPublicPools();
    res.json(pools);
  } catch (e) {
    console.error('[pools/public]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/pools — mes groupes
router.get('/', requireAuth, async (req, res) => {
  try {
    const pools = await getUserPools(req.user.id);
    res.json(pools);
  } catch (e) {
    console.error('[pools/list]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/pools — créer un groupe
router.post('/', requireAuth, async (req, res) => {
  try {
    const pool = await createPool(req.user.id, req.body.name);
    res.status(201).json(pool);
  } catch (e) {
    console.error('[pools/create]', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// POST /api/pools/join — rejoindre avec un code
router.post('/join', requireAuth, async (req, res) => {
  try {
    const pool = await joinPool(req.user.id, req.body.invite_code);
    res.json(pool);
  } catch (e) {
    console.error('[pools/join]', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ── Chat du groupe ───────────────────────────────────────────────────
const {
  getPoolMessages,
  postPoolMessage,
  toggleReaction,
  notifyNewChatMessage,
  ALLOWED_EMOJIS,
} = require('../services/chatService');

async function assertPoolAccess (userId, poolId) {
  const id = parseInt(poolId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error('Groupe invalide'), { status: 400 });
  }
  if (!await isPoolMember(userId, id)) {
    throw Object.assign(new Error('Accès refusé'), { status: 403 });
  }
  return id;
}

router.get('/:id/chat', requireAuth, async (req, res) => {
  try {
    const poolId = await assertPoolAccess(req.user.id, req.params.id);
    const messages = await getPoolMessages(poolId, req.user.id, {
      after: req.query.after || 0,
      limit: req.query.limit || 100,
    });
    res.json({ messages, emojis: ALLOWED_EMOJIS });
  } catch (e) {
    console.error('[pools/chat/list]', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.post('/:id/chat', requireAuth, async (req, res) => {
  try {
    const poolId = await assertPoolAccess(req.user.id, req.params.id);
    const message = await postPoolMessage(poolId, req.user.id, req.body.content);
    notifyNewChatMessage(poolId, req.user.id, message).catch(e => {
      console.warn('[pools/chat/push]', e.message);
    });
    res.status(201).json(message);
  } catch (e) {
    console.error('[pools/chat/post]', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.post('/:id/chat/:messageId/reactions', requireAuth, async (req, res) => {
  try {
    const poolId = await assertPoolAccess(req.user.id, req.params.id);
    const messageId = parseInt(req.params.messageId, 10);
    if (!Number.isInteger(messageId)) {
      return res.status(400).json({ error: 'Message invalide' });
    }
    const result = await toggleReaction(poolId, req.user.id, messageId, req.body.emoji);
    res.json(result);
  } catch (e) {
    console.error('[pools/chat/react]', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// GET /api/pools/:id — détail + membres
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const poolId = parseInt(req.params.id, 10);
    if (!Number.isInteger(poolId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const member = await isPoolMember(req.user.id, poolId);
    if (!member) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const pools = await getUserPools(req.user.id);
    const pool = pools.find(p => p.id === poolId);
    if (!pool) return res.status(404).json({ error: 'Groupe introuvable' });

    const members = await getPoolMembers(poolId);
    res.json({ ...pool, members });
  } catch (e) {
    console.error('[pools/detail]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
