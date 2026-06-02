/**
 * Ping /api/health pour réveiller un service Render (plan Free).
 *
 * ⚠️  Doit tourner EN DEHORS de Render (GitHub Actions, cron-job.org, PC…).
 *     Un cron sur Render ne peut pas réveiller l'app quand elle dort.
 *
 * Usage:
 *   RENDER_APP_URL=https://xxx.onrender.com node scripts/keepalive.js
 *   node scripts/keepalive.js --url=https://xxx.onrender.com
 *
 * Planifier (ex. toutes les 14 min) :
 *   - GitHub Actions : .github/workflows/keepalive.yml (recommandé)
 *   - https://cron-job.org → GET sur l'URL ci-dessous
 */
'use strict';

function parseUrl () {
  const arg = process.argv.find(a => a.startsWith('--url='));
  if (arg) return arg.slice('--url='.length).replace(/\/$/, '');
  const env = process.env.RENDER_APP_URL || process.env.APP_URL;
  if (env) return env.replace(/\/$/, '');
  console.error('❌ URL manquante — définissez RENDER_APP_URL ou --url=https://xxx.onrender.com');
  process.exit(1);
}

async function ping () {
  const base = parseUrl();
  const healthUrl = `${base}/api/health`;
  const started = Date.now();

  const res = await fetch(healthUrl, {
    method: 'GET',
    headers: { 'User-Agent': 'WorldCup-Pronostics-Keepalive/1.0' },
    signal: AbortSignal.timeout(120_000),
  });

  const ms = Date.now() - started;
  const body = await res.text();

  if (!res.ok) {
    console.error(`❌ ${res.status} ${healthUrl} (${ms}ms)`);
    console.error(body.slice(0, 200));
    process.exit(1);
  }

  let status = body;
  try { status = JSON.parse(body).status ?? body; } catch { /* raw */ }

  const cold = ms > 10_000 ? ' (cold start — service réveillé)' : '';
  console.log(`✅ ${healthUrl} → ${status} (${ms}ms)${cold}`);
}

ping().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
