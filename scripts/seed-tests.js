require('dotenv').config();
const { db, initDB, run, get, all } = require('../backend/database/db');

async function seed() {
  await initDB();

  console.log('🌱 Insertion de données de test...');

  // 1. Crée des joueurs de test
  const bcrypt = require('bcryptjs');
  const players = ['Alice', 'Bob', 'Charlie', 'David'];
  const userIds = [];

  for (const pseudo of players) {
    try {
      const hash = bcrypt.hashSync('test123', 10);
      const { lastID } = await run(
        `INSERT INTO users (pseudo, password_hash, role) VALUES (?, ?, 'player')`,
        [pseudo, hash]
      );
      userIds.push(lastID);
      console.log(`✅ Joueur créé : ${pseudo} (id ${lastID})`);
    } catch (e) {
      const u = await get('SELECT id FROM users WHERE pseudo = ?', [pseudo]);
      userIds.push(u.id);
      console.log(`⚠️  ${pseudo} existe déjà (id ${u.id})`);
    }
  }

  // 2. Récupère les 3 premiers matchs en base
  const matches = await all('SELECT * FROM matches ORDER BY match_date ASC LIMIT 3');
  if (!matches.length) {
    console.log('❌ Aucun match en base — lance d\'abord Admin → ⟳ Calendrier');
    process.exit(1);
  }

  // 3. Simule des scores réels sur ces matchs
  const fakeScores = [
    { home: 2, away: 1 },
    { home: 0, away: 0 },
    { home: 1, away: 3 },
  ];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const s = fakeScores[i];
    await run(`
      UPDATE matches
      SET home_score = ?, away_score = ?, status = 'FINISHED',
          match_date = datetime('now', '-2 hours'),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [s.home, s.away, m.id]);
    console.log(`⚽ Match ${m.home_team} vs ${m.away_team} → ${s.home}-${s.away} FINISHED`);
  }

  // 4. Insère des pronostics variés pour chaque joueur
  const pronos = [
    // Match 1 (score réel 2-1)
    [2, 1],  // Alice  → score exact      → 3 pts
    [1, 0],  // Bob    → bon résultat 1N2 → 1 pt
    [2, 0],  // Charlie→ bon résultat 1N2 → 1 pt
    [0, 2],  // David  → mauvais          → 0 pt

    // Match 2 (score réel 0-0)
    [0, 0],  // Alice  → score exact      → 3 pts
    [1, 1],  // Bob    → bon résultat N   → 1 pt
    [2, 1],  // Charlie→ mauvais          → 0 pt
    [0, 1],  // David  → mauvais          → 0 pt

    // Match 3 (score réel 1-3)
    [0, 2],  // Alice  → bon résultat 1N2 → 1 pt
    [1, 3],  // Bob    → score exact      → 3 pts
    [0, 1],  // Charlie→ bon résultat 1N2 → 1 pt
    [2, 0],  // David  → mauvais          → 0 pt
  ];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    for (let j = 0; j < userIds.length; j++) {
      const [ph, pa] = pronos[i * userIds.length + j];
      try {
        await run(`
          INSERT INTO predictions (user_id, match_id, predicted_home, predicted_away)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, match_id) DO UPDATE SET
            predicted_home = excluded.predicted_home,
            predicted_away = excluded.predicted_away
        `, [userIds[j], m.id, ph, pa]);
      } catch (e) {
        console.error(e.message);
      }
    }
  }
  console.log('✅ Pronostics insérés');

  // 5. Calcule les points
// Calcule les points directement en base
const finishedMatches = await all(
  `SELECT * FROM matches WHERE status = 'FINISHED' AND home_score IS NOT NULL`
);

for (const m of finishedMatches) {
  const predictions = await all(
    `SELECT * FROM predictions WHERE match_id = ? AND points IS NULL`,
    [m.id]
  );
  for (const p of predictions) {
    let pts = 0;
    if (p.predicted_home === m.home_score && p.predicted_away === m.away_score) {
      pts = 3;
    } else {
      const realResult = m.home_score > m.away_score ? '1' : m.home_score < m.away_score ? '2' : 'N';
      const predResult = p.predicted_home > p.predicted_away ? '1' : p.predicted_home < p.predicted_away ? '2' : 'N';
      if (realResult === predResult) pts = 1;
    }
    await run(`UPDATE predictions SET points = ? WHERE id = ?`, [pts, p.id]);
  }
}
console.log('✅ Points calculés directement en base');

  // 6. Affiche le classement
  const standings = await all(`
    SELECT u.pseudo,
           COALESCE(SUM(p.points), 0) AS total_points,
           SUM(CASE WHEN p.points = 3 THEN 1 ELSE 0 END) AS exact_scores,
           SUM(CASE WHEN p.points = 1 THEN 1 ELSE 0 END) AS good_results
    FROM users u
    LEFT JOIN predictions p ON p.user_id = u.id AND p.points IS NOT NULL
    WHERE u.role = 'player'
    GROUP BY u.id
    ORDER BY total_points DESC
  `);

  console.log('\n🏆 Classement :');
  standings.forEach((s, i) => {
    console.log(`  ${i+1}. ${s.pseudo} — ${s.total_points} pts (${s.exact_scores}✓ ${s.good_results}↗)`);
  });

  console.log('\n✅ Données de test insérées ! Lance le serveur et vérifie l\'app.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });