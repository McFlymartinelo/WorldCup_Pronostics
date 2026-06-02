require('dotenv').config();
const { initDB, all } = require('../backend/database/db');
const { computePoints } = require('../backend/services/footballApi');

(async () => {
  await initDB();
  const matches = await all(`
    SELECT id, home_score, away_score
    FROM matches
    WHERE status = 'FINISHED' AND home_score IS NOT NULL
  `);
  for (const m of matches) {
    await computePoints(m.id, m.home_score, m.away_score);
  }
  console.log(`✅ Points recalculés pour ${matches.length} match(s) terminé(s).`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
