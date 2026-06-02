'use strict';
const express = require('express');
const { all } = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { requirePool } = require('../middleware/requirePool');
const { fetchStandingsRows } = require('./stats');

const router = express.Router();

router.get('/', requireAuth, requirePool, async (req, res) => {
  try {
    const rows = await fetchStandingsRows(req.poolId);
    res.json(rows);
  } catch (e) {
    console.error('[standings]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
