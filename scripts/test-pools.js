'use strict';
require('dotenv').config();
const { initDB, all, get } = require('../backend/database/db');
const { getUserPools } = require('../backend/services/poolService');

async function main () {
  await initDB();
  const admin = await get('SELECT id FROM users WHERE role = ?', ['admin']);
  const pools = await getUserPools(admin.id);
  console.log('pools:', pools.map(p => `${p.name} (${p.member_count})`));
  const cols = await all('PRAGMA table_info(predictions)');
  console.log('predictions columns:', cols.map(c => c.name).join(', '));
}

main().catch(e => { console.error(e); process.exit(1); });
