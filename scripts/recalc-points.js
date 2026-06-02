require('dotenv').config();
const { initDB } = require('../backend/database/db');
const { recalculateAllFinishedMatches } = require('../backend/services/footballApi');

(async () => {
  await initDB();
  const { matches, predictions } = await recalculateAllFinishedMatches();
  console.log(`✅ Points recalculés : ${matches} match(s), ${predictions} pronostic(s).`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
