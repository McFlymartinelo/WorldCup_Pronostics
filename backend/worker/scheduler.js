'use strict';
const cron = require('node-cron');
const { syncFixtures, syncScores } = require('../services/footballApi');
const { sendToAll } = require('../services/pushService');
const { all, run }  = require('../database/db');

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

  // Notif coup d'envoi toutes les minutes
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