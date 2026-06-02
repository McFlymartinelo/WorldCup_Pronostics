'use strict';
const express         = require('express');
const { all }         = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/tournament
router.get('/', requireAuth, async (_req, res) => {
  try {
    const matches = await all(`
      SELECT * FROM matches ORDER BY match_date ASC
    `);

    // Groupes
    const groups = {};
    const knockout = {
      ROUND_OF_32:    [],
      ROUND_OF_16:    [],
      QUARTER_FINALS: [],
      SEMI_FINALS:    [],
      THIRD_PLACE:    [],
      FINAL:          [],
    };

    for (const m of matches) {
      if (m.group_name) {
        if (!groups[m.group_name]) groups[m.group_name] = { matches: [], standings: [] };
        groups[m.group_name].matches.push(m);
      } else if (knockout[m.stage]) {
        knockout[m.stage].push(m);
      }
    }

    // Calcule les classements de groupes
    for (const [groupName, group] of Object.entries(groups)) {
      const teams = {};
      for (const m of group.matches) {
        if (!teams[m.home_team]) teams[m.home_team] = { team: m.home_team, pts: 0, j: 0, g: 0, n: 0, p: 0, bp: 0, bc: 0, diff: 0 };
        if (!teams[m.away_team]) teams[m.away_team] = { team: m.away_team, pts: 0, j: 0, g: 0, n: 0, p: 0, bp: 0, bc: 0, diff: 0 };

        if (m.home_score !== null && m.away_score !== null) {
          const h = teams[m.home_team];
          const a = teams[m.away_team];
          h.j++; a.j++;
          h.bp += m.home_score; h.bc += m.away_score;
          a.bp += m.away_score; a.bc += m.home_score;
          if (m.home_score > m.away_score)      { h.g++; h.pts += 3; a.p++; }
          else if (m.home_score < m.away_score) { a.g++; a.pts += 3; h.p++; }
          else                                   { h.n++; a.n++; h.pts++; a.pts++; }
        }
      }
      for (const t of Object.values(teams)) t.diff = t.bp - t.bc;
      group.standings = Object.values(teams).sort((a, b) =>
        b.pts - a.pts || b.diff - a.diff || b.bp - a.bp
      );
    }

    res.json({ groups, knockout });
  } catch (e) {
    console.error('[tournament]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;