'use strict';
const fetch = require('node-fetch');
const { ALIASES } = require('../data/teamIntelData');
const { getWcHistory } = require('../data/wcHistoryData');
const { getFifaRank } = require('../data/fifaRankingsData');
const { getTeamRecords } = require('../data/teamRecordsData');
const { MANUAL_TEAM_MAP } = require('../data/competitionTeams');

const BSD_BASE = 'https://sports.bzzoiro.com/api/v2';
const FD_BASE  = process.env.FOOTBALL_API_BASE_URL || 'https://api.football-data.org/v4';
const FRIENDLY_LEAGUE_ID = 31;
const BSD_SEARCH_ALIASES = {
  'United States': ['USA', 'United States'],
  'South Korea': ['Korea Republic', 'South Korea'],
  'Ivory Coast': ["Côte d'Ivoire", 'Ivory Coast'],
  'Cape Verde Islands': ['Cabo Verde', 'Cape Verde Islands'],
  Iran: ['IR Iran', 'Iran'],
  Turkey: ['Türkiye', 'Turkey'],
};

/** football-data.org → nom canonique app */
const FOOTBALL_NAME_MAP = {
  'Korea Republic': 'South Korea',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde Islands',
  'Cape Verde': 'Cape Verde Islands',
  'USA': 'United States',
  'IR Iran': 'Iran',
  'Türkiye': 'Turkey',
};

let wcTeamsCache = null;
let wcTeamsCacheTs = 0;
let qualLeagueIds = null;
let squadCache = null;
let squadCacheTs = 0;

async function fdFetch (path) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return null;
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { 'X-Auth-Token': key },
  });
  if (!res.ok) return null;
  return res.json();
}

async function bsdFetch (path) {
  const key = process.env.BSD_API_KEY;
  if (!key) return null;
  const res = await fetch(`${BSD_BASE}${path}`, {
    headers: { Authorization: `Token ${key}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function canonicalName (name) {
  if (!name) return null;
  if (FOOTBALL_NAME_MAP[name]) return FOOTBALL_NAME_MAP[name];
  const alias = ALIASES[name.toLowerCase()];
  if (alias) return alias;
  return name;
}

function namesMatch (a, b) {
  return canonicalName(a).toLowerCase() === canonicalName(b).toLowerCase();
}

async function loadFootballWcTeams () {
  if (wcTeamsCache && Date.now() - wcTeamsCacheTs < 3600000) return wcTeamsCache;

  const data = await fdFetch('/competitions/WC/teams');
  const map = new Map();
  const nameSet = new Set();

  for (const t of data?.teams || []) {
    const key = canonicalName(t.name);
    map.set(key, {
      id: t.id,
      name: key,
      fdName: t.name,
      coach: t.coach?.name || null,
      squad: t.squad || [],
      crest: t.crest,
    });
    nameSet.add(key);
    nameSet.add(t.name);
  }

  wcTeamsCache = { map, nameSet };
  wcTeamsCacheTs = Date.now();
  return wcTeamsCache;
}

async function getQualLeagueIds () {
  if (qualLeagueIds) return qualLeagueIds;
  const data = await bsdFetch('/leagues/?limit=100');
  qualLeagueIds = (data?.results || [])
    .filter(l => /world cup qualification/i.test(l.name))
    .map(l => l.id);
  return qualLeagueIds;
}

async function loadSquadsByTeamId () {
  if (squadCache && Date.now() - squadCacheTs < 3600000) return squadCache;

  let allPlayers = [];
  let offset = 0;

  while (true) {
    const data = await bsdFetch(`/worldcup/squads/?limit=200&offset=${offset}`);
    if (!data?.results?.length) break;
    allPlayers = allPlayers.concat(data.results);
    if (!data.next) break;
    offset += 200;
  }

  const byTeamId = {};
  for (const p of allPlayers) {
    if (!byTeamId[p.team_id]) byTeamId[p.team_id] = [];
    byTeamId[p.team_id].push(p);
  }

  squadCache = byTeamId;
  squadCacheTs = Date.now();
  return squadCache;
}

function resolveBsdTeamId (teamName) {
  const key = canonicalName(teamName);
  if (MANUAL_TEAM_MAP[key] != null) return MANUAL_TEAM_MAP[key];
  for (const [name, id] of Object.entries(MANUAL_TEAM_MAP)) {
    if (namesMatch(name, key) && id != null) return id;
  }
  return null;
}

function resolveBsdTeamIdFromEvent (events, teamName) {
  for (const e of events) {
    if (namesMatch(e.home_team, teamName)) return e.home_team_id;
    if (namesMatch(e.away_team, teamName)) return e.away_team_id;
  }
  return null;
}

const CO_HOSTS = new Set(['United States', 'Mexico', 'Canada']);

function bsdSearchNames (teamName) {
  const key = canonicalName(teamName);
  const fd = wcTeamsCache?.map?.get(key);
  const names = new Set([fd?.fdName, key, ...(BSD_SEARCH_ALIASES[key] || [])].filter(Boolean));
  return [...names];
}

let intlLeagueIds = null;

async function getInternationalLeagueIds () {
  if (intlLeagueIds) return intlLeagueIds;
  const qual = await getQualLeagueIds();
  const data = await bsdFetch('/leagues/?limit=100');
  const fromApi = (data?.results || [])
    .filter(l => {
      const n = l.name.toLowerCase();
      return /world cup|friendly|nations league|euro|copa america|gold cup|afcon|asian cup|qualification|confederations/.test(n);
    })
    .map(l => l.id);
  intlLeagueIds = new Set([...qual, ...fromApi, 27, 31, 64, 66]);
  return intlLeagueIds;
}

function looksLikeClub (name) {
  if (!name) return true;
  const n = name.toLowerCase();
  if (n === 'united states' || n === 'new zealand') return false;
  return /\b(fc|sc|cf)\b|athletic| rovers| wanderers| county|wanderers/.test(n)
    || /\bunited\b/.test(n) && !n.includes('states');
}

function isNationalMatch (event, intlIds, nameSet) {
  if (intlIds.has(event.league_id)) return true;
  if (looksLikeClub(event.home_team) || looksLikeClub(event.away_team)) return false;
  return nameSet.has(event.home_team) && nameSet.has(event.away_team);
}

function resultForTeam (m, teamName) {
  const hs = m.home_score;
  const as = m.away_score;
  if (hs == null || as == null) return '?';
  const isHome = namesMatch(m.home_team, teamName);
  const [mine, theirs] = isHome ? [hs, as] : [as, hs];
  if (mine > theirs) return 'V';
  if (mine < theirs) return 'D';
  return 'N';
}

function computeStreak (results) {
  const clean = results.filter(r => r !== '?');
  if (!clean.length) return null;
  const first = clean[0];
  let count = 1;
  for (let i = 1; i < clean.length; i++) {
    if (clean[i] === first) count++;
    else break;
  }
  const labels = { V: 'victoire', D: 'défaite', N: 'nul' };
  const plural = { V: 'victoires', D: 'défaites', N: 'nuls' };
  const label = count > 1 ? plural[first] : labels[first];
  if (first === 'V') return `${count} ${label} consécutive${count > 1 ? 's' : ''}`;
  if (first === 'D') return `${count} ${label} consécutive${count > 1 ? 's' : ''}`;
  return `${count} match${count > 1 ? 's' : ''} invaincu${count > 1 ? 's' : ''}`;
}

function formatMatchLine (m, teamName) {
  const isHome = namesMatch(m.home_team, teamName);
  const opponent = isHome ? m.away_team : m.home_team;
  const venue = resultForTeam(m, teamName);
  const date = m.event_date || m.date || m.start_time || '';
  return {
    opponent,
    score: `${m.home_score ?? '-'}-${m.away_score ?? '-'}`,
    venue: venue === 'V' ? 'V' : venue === 'D' ? 'D' : venue === 'N' ? 'N' : null,
    date: date ? String(date).slice(0, 10) : '',
    competition: m.competition?.name || m.competition_name || '',
  };
}

function formatFriendlyLine (m, teamName) {
  const line = formatMatchLine(m, teamName);
  const month = line.date ? new Date(line.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
  return { opponent: line.opponent, score: line.score, date: month || line.date };
}

async function fetchNationalEvents (teamName, limit = 80) {
  const { nameSet } = await loadFootballWcTeams();
  const intlIds = await getInternationalLeagueIds();

  for (const search of bsdSearchNames(teamName)) {
    const data = await bsdFetch(
      `/events/?team_name=${encodeURIComponent(search)}&status=finished&limit=100`
    );
    const filtered = (data?.results || [])
      .filter(e => isNationalMatch(e, intlIds, nameSet))
      .filter(e => namesMatch(e.home_team, teamName) || namesMatch(e.away_team, teamName));
    if (filtered.length) return filtered.slice(0, limit);
  }
  return [];
}

function buildQualificationSummary (matches, teamName) {
  if (CO_HOSTS.has(canonicalName(teamName))) {
    return 'Qualifié automatiquement — co-organisateur CdM 2026.';
  }
  if (!matches.length) {
    return 'Parcours qualificatif : données BSD non disponibles pour le moment.';
  }

  let w = 0; let d = 0; let l = 0;
  for (const m of matches) {
    const r = resultForTeam(m, teamName);
    if (r === 'V') w++;
    else if (r === 'N') d++;
    else if (r === 'D') l++;
  }
  return `${w} victoire${w > 1 ? 's' : ''}, ${d} nul${d > 1 ? 's' : ''}, ${l} défaite${l > 1 ? 's' : ''} en qualifications (${matches.length} matchs).`;
}

function pickWatchFromSquad (players) {
  const official = players.filter(p => p.status === 'official');
  const posOrder = { FW: 0, ATT: 0, MF: 1, MID: 1, DF: 2, DEF: 2, GK: 3 };
  return [...official]
    .sort((a, b) => {
      const pa = posOrder[a.position] ?? 9;
      const pb = posOrder[b.position] ?? 9;
      if (pa !== pb) return pa - pb;
      return (b.goals - a.goals) || (b.caps - a.caps);
    })
    .slice(0, 4)
    .map(p => p.name);
}

function pickWatchFromFootballSquad (squad) {
  const preferred = ['Offence', 'Midfield'];
  return [...(squad || [])]
    .filter(p => preferred.some(pos => (p.position || '').includes(pos)))
    .slice(0, 4)
    .map(p => p.name);
}

function buildSquadIntel (players) {
  if (!players?.length) return { watch: [], currentStar: null };

  const official = players.filter(p => p.status === 'official');
  const watch = pickWatchFromSquad(players);

  if (!official.length) {
    return { watch, currentStar: null };
  }

  const topScorer = [...official].sort((a, b) => b.goals - a.goals || b.caps - a.caps)[0];
  const topCapped = [...official].sort((a, b) => b.caps - a.caps)[0];

  return {
    watch,
    currentStar: topScorer?.name || topCapped?.name || null,
  };
}

async function fetchCurrentStarFromPlayers (nationalTeamId) {
  if (!nationalTeamId) return null;
  const data = await bsdFetch(
    `/players/?national_team_id=${nationalTeamId}&limit=100`
  );
  if (!data?.results?.length) return null;

  const top = [...data.results].sort(
    (a, b) => (b.market_value_eur || 0) - (a.market_value_eur || 0)
  )[0];
  return top?.name || null;
}

async function resolveTeamKey (name) {
  if (!name) return null;
  const { map } = await loadFootballWcTeams();
  const key = canonicalName(name);
  if (map.has(key)) return key;
  const found = [...map.keys()].find(k => k.toLowerCase() === key.toLowerCase());
  return found || null;
}

async function buildTeamIntel (teamName) {
  const key = await resolveTeamKey(teamName);
  if (!key) return null;

  const { map } = await loadFootballWcTeams();
  const fdTeam = map.get(key);
  const qualIds = await getQualLeagueIds();
  const events = await fetchNationalEvents(key, 80);

  const qualMatches = events.filter(e => qualIds.includes(e.league_id));
  const friendlyMatches = events.filter(e => e.league_id === FRIENDLY_LEAGUE_ID);
  const results = events.map(m => resultForTeam(m, key));

  const bsdTeamId = resolveBsdTeamId(key) || resolveBsdTeamIdFromEvent(events, key);
  let squadIntel = {};
  if (bsdTeamId) {
    const squads = await loadSquadsByTeamId();
    squadIntel = buildSquadIntel(squads[bsdTeamId]);
  }

  const fdWatch = pickWatchFromFootballSquad(fdTeam?.squad);
  const history = getWcHistory(key) || {};
  const records = getTeamRecords(key) || {};

  const apiStar = squadIntel.currentStar
    || await fetchCurrentStarFromPlayers(bsdTeamId)
    || fdWatch[0]
    || null;

  return {
    ...history,
    teamName: key,
    found: true,
    fifa_rank: getFifaRank(key),
    coach: fdTeam?.coach || null,
    qualification: buildQualificationSummary(qualMatches, key),
    qualification_matches: qualMatches.slice(0, 6).map(m => formatMatchLine(m, key)),
    streak: computeStreak(results),
    form_extended: results.slice(0, 12).join(' '),
    friendlies: friendlyMatches.slice(0, 5).map(m => formatFriendlyLine(m, key)),
    friendlies_live: friendlyMatches.slice(0, 5).map(m => formatMatchLine(m, key)),
    watch: [...new Set(squadIntel.watch?.length ? squadIntel.watch : fdWatch)],
    best: apiStar || records.best || null,
    capped: records.capped || null,
    scorer: records.scorer || null,
    recent_matches: events.slice(0, 8).map(m => formatMatchLine(m, key)),
    data_source: 'api',
  };
}

module.exports = {
  buildTeamIntel,
  resolveTeamKey,
  canonicalName,
  fetchNationalEvents,
  loadFootballWcTeams,
};
