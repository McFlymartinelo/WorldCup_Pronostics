'use strict';
const fetch = require('node-fetch');
const { ALIASES } = require('../data/teamIntelData');

const CSV_URL = process.env.H2H_CSV_URL
  || 'https://raw.githubusercontent.com/martj42/international_results/master/results.csv';

const FOOTBALL_NAME_MAP = {
  'Korea Republic': 'South Korea',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde Islands',
  'Cape Verde': 'Cape Verde Islands',
  USA: 'United States',
  'IR Iran': 'Iran',
  Türkiye: 'Turkey',
};

const DISPLAY_LIMIT = 20;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Noms CSV → nom canonique (successeurs d'États, variantes historiques). */
const CSV_NAME_MAP = {
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Czech Republic': 'Czechia',
  Czechoslovakia: 'Czechia',
  'Cape Verde': 'Cape Verde Islands',
  'Korea Republic': 'South Korea',
  'Korea DPR': 'North Korea',
  'China PR': 'China',
  'DR Congo': 'Congo DR',
  'Republic of Ireland': 'Ireland',
  USA: 'United States',
  Türkiye: 'Turkey',
  'IR Iran': 'Iran',
  "Côte d'Ivoire": 'Ivory Coast',
};

let matchesCache = null;
let cacheLoadedAt = 0;
const pairCache = new Map();

function appCanonicalName (name) {
  if (!name) return null;
  if (FOOTBALL_NAME_MAP[name]) return FOOTBALL_NAME_MAP[name];
  const alias = ALIASES[name.toLowerCase()];
  if (alias) return alias;
  return name;
}

function csvCanonicalName (name) {
  if (!name) return null;
  if (CSV_NAME_MAP[name]) return CSV_NAME_MAP[name];
  return appCanonicalName(name) || name;
}

function parseCsvLine (line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  fields.push(cur);
  return fields;
}

function parseScore (value) {
  if (value == null || value === '' || value === 'NA') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function shortComp (tournament) {
  if (!tournament) return 'Match';
  if (/fifa world cup/i.test(tournament)) return 'CdM';
  if (/friendly/i.test(tournament)) return 'Amical';
  if (/qualif/i.test(tournament)) return 'Qualif.';
  if (/gold cup/i.test(tournament)) return 'Gold Cup';
  if (/confederations/i.test(tournament)) return 'Coupe des Conféd.';
  if (/euro|uefa/i.test(tournament)) return 'Euro';
  if (/copa america/i.test(tournament)) return 'Copa América';
  if (/olympic|olympics/i.test(tournament)) return 'JO';
  return tournament.length > 40 ? `${tournament.slice(0, 37)}…` : tournament;
}

function resultNote (home, away, hs, as) {
  if (hs == null || as == null) return 'À venir';
  if (hs === as) return 'Match nul';
  const winner = hs > as ? home : away;
  return `Victoire ${winner}`;
}

function h2hKey (teamA, teamB) {
  const a = csvCanonicalName(teamA);
  const b = csvCanonicalName(teamB);
  return [a, b].sort((x, y) => x.localeCompare(y)).join('|');
}

async function loadMatches () {
  if (matchesCache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
    return matchesCache;
  }

  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`H2H CSV fetch failed (${res.status})`);

  const text = await res.text();
  const lines = text.split(/\r?\n/);
  const matches = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const f = parseCsvLine(line);
    if (f.length < 5) continue;

    const home = csvCanonicalName(f[1]);
    const away = csvCanonicalName(f[2]);
    if (!home || !away || home === away) continue;

    matches.push({
      date: f[0],
      home,
      away,
      homeScore: parseScore(f[3]),
      awayScore: parseScore(f[4]),
      tournament: f[5] || '',
      city: f[6] || '',
      country: f[7] || '',
      neutral: /^true$/i.test(f[8]),
    });
  }

  matchesCache = matches;
  cacheLoadedAt = Date.now();
  pairCache.clear();
  console.log(`[h2h-csv] ${matches.length} matchs chargés`);
  return matches;
}

function computeStats (meetings, teamA, teamB) {
  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let played = 0;

  for (const m of meetings) {
    if (m.homeScore == null || m.awayScore == null) continue;
    played++;

    const aHome = m.home === teamA;
    const aScore = aHome ? m.homeScore : m.awayScore;
    const bScore = aHome ? m.awayScore : m.homeScore;

    if (aScore > bScore) winsA++;
    else if (aScore < bScore) winsB++;
    else draws++;
  }

  return { played, wins_a: winsA, wins_b: winsB, draws };
}

function buildSummary (teamA, teamB, stats) {
  if (!stats.played) {
    return stats.upcoming
      ? `${stats.upcoming} confrontation(s) programmée(s), aucun match joué.`
      : 'Aucune confrontation directe recensée.';
  }

  const lead = stats.wins_a > stats.wins_b
    ? `${teamA} mène (${stats.wins_a}V-${stats.draws}N-${stats.wins_b}D).`
    : stats.wins_b > stats.wins_a
      ? `${teamB} mène (${stats.wins_b}V-${stats.draws}N-${stats.wins_a}D).`
      : `Bilan équilibré (${stats.wins_a}V-${stats.draws}N-${stats.wins_b}D).`;

  return `${stats.played} match(s) — ${lead}`;
}

async function getH2HFromCsv (teamA, teamB) {
  const canonA = csvCanonicalName(teamA);
  const canonB = csvCanonicalName(teamB);
  const key = h2hKey(canonA, canonB);

  if (pairCache.has(key)) return pairCache.get(key);

  const all = await loadMatches();
  const raw = all.filter(m =>
    (m.home === canonA && m.away === canonB)
    || (m.home === canonB && m.away === canonA),
  );

  raw.sort((a, b) => b.date.localeCompare(a.date));

  const [team_a, team_b] = key.split('|');
  const statsBase = computeStats(raw, team_a, team_b);
  const upcoming = raw.filter(m => m.homeScore == null || m.awayScore == null).length;
  const stats = { ...statsBase, upcoming };

  const meetings = raw.slice(0, DISPLAY_LIMIT).map(m => ({
    date: m.date,
    comp: shortComp(m.tournament),
    score: m.homeScore == null || m.awayScore == null
      ? '—'
      : `${m.homeScore}-${m.awayScore}`,
    note: resultNote(m.home, m.away, m.homeScore, m.awayScore),
    home: m.home,
    away: m.away,
  }));

  const result = {
    found: raw.length > 0,
    team_a,
    team_b,
    summary: buildSummary(team_a, team_b, stats),
    meetings,
    stats: statsBase.played ? {
      played: statsBase.played,
      wins_a: statsBase.wins_a,
      wins_b: statsBase.wins_b,
      draws: statsBase.draws,
      total: raw.length,
      upcoming,
    } : (raw.length ? { played: 0, wins_a: 0, wins_b: 0, draws: 0, total: raw.length, upcoming } : null),
    source: 'csv',
  };

  pairCache.set(key, result);
  return result;
}

async function preloadH2H () {
  try {
    await loadMatches();
  } catch (e) {
    console.warn('[h2h-csv] preload:', e.message);
  }
}

module.exports = {
  getH2HFromCsv,
  preloadH2H,
  h2hKey,
  csvCanonicalName,
  CSV_URL,
};
