'use strict';
const express         = require('express');
const { requireAuth } = require('../middleware/auth');
const { getTeamIntel, getH2H } = require('../services/teamIntelService');

const router = express.Router();

// GET /api/teams/h2h/:home/:away
router.get('/h2h/:home/:away', requireAuth, async (req, res) => {
  try {
    const home = decodeURIComponent(req.params.home);
    const away = decodeURIComponent(req.params.away);
    const data = await getH2H(home, away);
    res.json(data);
  } catch (e) {
    console.error('[teams/h2h]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/teams/:name/summary
router.get('/:name/summary', requireAuth, async (req, res) => {
  try {
    const teamName = decodeURIComponent(req.params.name);
    const data = await getTeamIntel(teamName);
    res.json(data);
  } catch (e) {
    console.error('[teams/summary]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
