'use strict';
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requirePool } = require('../middleware/requirePool');
const { getPoolAdvancedStats } = require('../services/statsService');

const router = express.Router();

router.get('/advanced', requireAuth, requirePool, async (req, res) => {
  try {
    const data = await getPoolAdvancedStats(req.poolId);
    res.json(data);
  } catch (e) {
    console.error('[stats/advanced]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
