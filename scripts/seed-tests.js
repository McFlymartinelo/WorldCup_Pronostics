/**
 * Simule des matchs terminés, pronostics et points pour tester
 * le classement, les stats avancées et le chat.
 *
 * Usage:
 *   node scripts/seed-tests.js
 *   node scripts/seed-tests.js --pool-id=2
 *   node scripts/seed-tests.js --pool=Test
 *
 * Prérequis: au moins 1 match en base (Admin → Calendrier, ou sync fixtures).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDB, run, get, all } = require('../backend/database/db');
const { getGeneralPoolId } = require('../backend/services/poolService');
const { computePoints: recalcMatchPoints } = require('../backend/services/footballApi');

function parseArg (prefix) {
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

async function resolvePoolId () {
  const idArg = parseArg('--pool-id=');
  if (idArg) return parseInt(idArg, 10);

  const nameArg = parseArg('--pool=');
  if (nameArg) {
    const row = await get('SELECT id FROM pools WHERE name = ? COLLATE NOCASE', [nameArg]);
    if (!row) throw new Error(`Groupe introuvable : « ${nameArg} »`);
    return row.id;
  }

  return getGeneralPoolId();
}

function scorePoints (predHome, predAway, realHome, realAway) {
  if (predHome === realHome && predAway === realAway) return 3;
  const res = (h, a) => (h > a ? '1' : h < a ? '2' : 'N');
  return res(predHome, predAway) === res(realHome, realAway) ? 1 : 0;
}

async function seed () {
  await initDB();

  const poolId = await resolvePoolId();
  const pool = await get('SELECT name FROM pools WHERE id = ?', [poolId]);
  console.log(`🌱 Simulation — groupe « ${pool?.name || poolId} » (#${poolId})\n`);

  const players = ['Alice', 'Bob', 'Charlie', 'David'];
  const userIds = [];

  for (const pseudo of players) {
    try {
      const hash = bcrypt.hashSync('test123', 10);
      const { lastID } = await run(
        `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
        [pseudo, hash],
      );
      userIds.push(lastID);
      await run(
        `INSERT OR IGNORE INTO pool_members (pool_id, user_id, role) VALUES (?, ?, 'member')`,
        [poolId, lastID],
      );
      console.log(`✅ Joueur : ${pseudo} (mot de passe: test123)`);
    } catch {
      const u = await get('SELECT id FROM users WHERE pseudo = ?', [pseudo]);
      if (u) {
        userIds.push(u.id);
        await run(
          `INSERT OR IGNORE INTO pool_members (pool_id, user_id, role) VALUES (?, ?, 'member')`,
          [poolId, u.id],
        );
        console.log(`⚠️  ${pseudo} existe déjà`);
      }
    }
  }

  const matches = await all(
    'SELECT * FROM matches ORDER BY match_date ASC LIMIT 5',
  );
  if (!matches.length) {
    console.log('\n❌ Aucun match — connecte-toi en admin et clique « Calendrier »,');
    console.log('   ou configure FOOTBALL_API_KEY puis relance ce script.');
    process.exit(1);
  }

  const fakeScores = [
    { home: 2, away: 1 },
    { home: 0, away: 0 },
    { home: 1, away: 3 },
    { home: 3, away: 3 },
    { home: 0, away: 2 },
  ];

  const baseDate = Date.now() - matches.length * 86400000;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const s = fakeScores[i % fakeScores.length];
    const pastDate = new Date(baseDate + i * 86400000).toISOString().slice(0, 19).replace('T', ' ');

    await run(`
      UPDATE matches
      SET home_score = ?, away_score = ?, status = 'FINISHED',
          match_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [s.home, s.away, pastDate, m.id]);

    await recalcMatchPoints(m.id, s.home, s.away);

    console.log(`⚽ ${m.home_team} ${s.home}-${s.away} ${m.away_team} (${pastDate.slice(0, 10)})`);
  }

  const pronos = [
    [2, 1], [1, 0], [2, 0], [0, 2],
    [0, 0], [1, 1], [2, 1], [0, 1],
    [0, 2], [1, 3], [0, 1], [2, 0],
    [3, 3], [2, 2], [1, 1], [0, 0],
    [1, 2], [0, 0], [2, 2], [3, 0],
  ];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const s = fakeScores[i % fakeScores.length];
    for (let j = 0; j < userIds.length; j++) {
      const [ph, pa] = pronos[(i * userIds.length + j) % pronos.length];
      const pts = scorePoints(ph, pa, s.home, s.away);
      await run(`
        INSERT INTO predictions (user_id, match_id, pool_id, predicted_home, predicted_away, points)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, match_id, pool_id) DO UPDATE SET
          predicted_home = excluded.predicted_home,
          predicted_away = excluded.predicted_away,
          points = excluded.points,
          updated_at = CURRENT_TIMESTAMP
      `, [userIds[j], m.id, poolId, ph, pa, pts]);
    }
  }
  console.log('✅ Pronostics + points calculés');

  await run(`
    UPDATE pool_members SET pick_winner = 'France', pick_top_scorer = NULL
    WHERE pool_id = ? AND user_id = ?
  `, [poolId, userIds[0]]);
  await run(`
    UPDATE pool_members SET pick_winner = 'Brazil', pick_top_scorer = NULL
    WHERE pool_id = ? AND user_id = ?
  `, [poolId, userIds[1]]);

  await run(`
    UPDATE competition_meta SET winner_team = 'France', top_scorer = 'Kylian Mbappé',
           updated_at = CURRENT_TIMESTAMP WHERE id = 1
  `);
  console.log('🏆 Bonus simulés : vainqueur France (+5 pts pour Alice)');

  const standings = await all(`
    SELECT u.pseudo,
           COALESCE(SUM(p.points), 0)
             + CASE WHEN cm.winner_team IS NOT NULL AND pm.pick_winner = cm.winner_team THEN 5 ELSE 0 END
             AS total_points,
           SUM(CASE WHEN p.points = 3 THEN 1 ELSE 0 END) AS exact_scores
    FROM pool_members pm
    JOIN users u ON u.id = pm.user_id
    LEFT JOIN predictions p ON p.user_id = u.id AND p.pool_id = pm.pool_id AND p.points IS NOT NULL
    LEFT JOIN competition_meta cm ON cm.id = 1
    WHERE pm.pool_id = ? AND u.role = 'player'
    GROUP BY u.id
    ORDER BY total_points DESC
  `, [poolId]);

  console.log('\n🏆 Classement simulé :');
  standings.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.pseudo} — ${s.total_points} pts (${s.exact_scores} exacts)`);
  });

  console.log(`
✅ Terminé ! Prochaines étapes :
   1. Redémarre le serveur si besoin
   2. Connecte-toi (ex. Alice / test123)
   3. Sélectionne le groupe « ${pool?.name || poolId} » → Classement → Statistiques
`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
