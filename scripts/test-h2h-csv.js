'use strict';
const { getH2HFromCsv } = require('../backend/services/h2hCsvService');

async function main () {
  const pairs = [
    ['France', 'Senegal'],
    ['Mexico', 'South Korea'],
    ['Mexico', 'Czechia'],
    ['Canada', 'Qatar'],
    ['Qatar', 'Switzerland'],
  ];

  for (const [a, b] of pairs) {
    const h = await getH2HFromCsv(a, b);
    console.log(`\n${a} vs ${b}: ${h.stats?.total || 0} total, ${h.stats?.played || 0} played`);
    console.log(h.summary);
    console.log(h.meetings.slice(0, 3).map(m => `${m.date} ${m.comp} ${m.score}`).join('\n'));
  }
}

main().catch(console.error);
