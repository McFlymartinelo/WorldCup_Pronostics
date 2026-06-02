'use strict';
const cron = require('node-cron');
const { syncFixtures, syncScores } = require('../services/footballApi');
const { sendToAll, sendToUser } = require('../services/pushService');
const { all, run }  = require('../database/db');

const REMINDER_MINUTES = parseInt(process.env.PREDICTION_REMINDER_MINUTES || '120', 10);

async function sendPredictionReminders () {
  const margin = 5;
  const minM = REMINDER_MINUTES - margin;
  const maxM = REMINDER_MINUTES + margin;

  const upcoming = await all(`
    SELECT id, home_team, away_team FROM matches
    WHERE status IN ('SCHEDULED', 'TIMED')
      AND match_date BETWEEN datetime('now', '+${minM} minutes') AND datetime('now', '+${maxM} minutes')
  `);

  for (const m of upcoming) {
    const missing = await all(`
      SELECT pm.user_id, pm.pool_id, p.name AS pool_name
      FROM pool_members pm
      JOIN pools p ON p.id = pm.pool_id
      JOIN users u ON u.id = pm.user_id
      LEFT JOIN predictions pr
             ON pr.user_id = pm.user_id AND pr.match_id = ? AND pr.pool_id = pm.pool_id
      LEFT JOIN prediction_reminders r
             ON r.user_id = pm.user_id AND r.match_id = ? AND r.pool_id = pm.pool_id
      WHERE u.role = 'player' AND pr.id IS NULL AND r.user_id IS NULL
    `, [m.id, m.id]);

    for (const row of missing) {
      await sendToUser(
        row.user_id,
        '⏰ Pronostic manquant',
        `${m.home_team} vs ${m.away_team} dans ~${Math.round(REMINDER_MINUTES / 60)} h — groupe « ${row.pool_name} »`,
        { matchId: m.id, type: 'reminder', poolId: row.pool_id },
      );
      await run(
        'INSERT INTO prediction_reminders (user_id, match_id, pool_id) VALUES (?, ?, ?)',
        [row.user_id, m.id, row.pool_id],
      );
    }
  }
}

// Définie en dehors de startScheduler pour pouvoir être exportée
async function notifyScoreUpdate(match) {
  try {
    await sendToAll(
      '🏁 Score mis à jour !',
      `${match.home_team} ${match.home_score} – ${match.away_score} ${match.away_team}`,
      { matchId: match.id, type: 'score' }
    );
  } catch (e) {
    console.error('[push] notifyScoreUpdate:', e.message);
  }
}

function startScheduler () {
  const scoresInterval   = process.env.CRON_SCORES_INTERVAL  || '*/5 * * * *';
  const fixturesInterval = process.env.CRON_FIXTURES_INTERVAL || '0 */6 * * *';

  // Scores toutes les 5 min
  cron.schedule(scoresInterval, async () => {
    console.log('⏱  [cron] Synchronisation des scores...');
    try { await syncScores(); }
    catch (e) { console.error('[cron] scores error:', e.message); }
  });

  // Calendrier toutes les 6h
  cron.schedule(fixturesInterval, async () => {
    console.log('⏱  [cron] Synchronisation du calendrier...');
    try { await syncFixtures(); }
    catch (e) { console.error('[cron] fixtures error:', e.message); }
  });

  // Notif coup d'envoi + rappels pronos manquants — toutes les minutes
  cron.schedule('* * * * *', async () => {
    try {
      const soon = await all(`
        SELECT * FROM matches
        WHERE status IN ('SCHEDULED', 'TIMED')
          AND kickoff_notified_at IS NULL
          AND match_date BETWEEN datetime('now') AND datetime('now', '+5 minutes')
      `);
      for (const m of soon) {
        await sendToAll(
          '⚽ Coup d\'envoi imminent !',
          `${m.home_team} vs ${m.away_team} commence dans 5 minutes !`,
          { matchId: m.id, type: 'kickoff' }
        );
        await run(`
          UPDATE matches
          SET kickoff_notified_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [m.id]);
      }

      await sendPredictionReminders();
    } catch (e) {
      console.error('[push cron]', e.message);
    }
  });

  // Re-synchro sélections tous les jours à 8h
  cron.schedule('0 8 * * *', async () => {
    console.log('⏱  [cron] Re-synchro des sélections...');
    try {
      const { syncSquads } = require('../routes/squads');
      await syncSquads();
    } catch (e) {
      console.error('[cron] squads error:', e.message);
    }
  });

  // Synchro initiale au démarrage
  setTimeout(async () => {
    console.log('🚀  Synchro initiale au démarrage...');
    try { await syncFixtures(); } catch (e) { console.error(e.message); }
    try { await syncScores();   } catch (e) { console.error(e.message); }
  }, 3000);

  console.log('✅  Scheduler démarré');
}

module.exports = { startScheduler, notifyScoreUpdate };