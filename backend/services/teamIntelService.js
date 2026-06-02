'use strict';
const fetch = require('node-fetch');
const { getStaticIntel, resolveTeamKey } = require('../data/teamIntelData');
const { getStaticH2H } = require('../data/h2hData');

const BASE = 'https://sports.bzzoiro.com/api/v2';
const KEY  = process.env.BSD_API_KEY;

async function bsdFetch (path) {
  if (!KEY) return null;
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Token ${KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function normalizeTeam (name) {
  return resolveTeamKey(name) || name;
}

function resultForTeam (m, teamName) {
  const home = m.home_team?.name || m.home_team || '';
  const away = m.away_team?.name || m.away_team || '';
  const hs = m.home_score;
  const as = m.away_score;
  if (hs == null || as == null) return '?';
  const isHome = home.toLowerCase() === teamName.toLowerCase()
    || normalizeTeam(home).toLowerCase() === normalizeTeam(teamName).toLowerCase();
  const [mine, theirs] = isHome ? [hs, as] : [as, hs];
  if (mine > theirs) return 'V';
  if (mine < theirs) return 'D';
  return 'N';
}

function computeStreak (results) {
  if (!results.length) return null;
  const first = results[0];
  let count = 1;
  for (let i = 1; i < results.length; i++) {
    if (results[i] === first) count++;
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
  const home = m.home_team?.name || m.home_team || '?';
  const away = m.away_team?.name || m.away_team || '?';
  const hs = m.home_score ?? '-';
  const as = m.away_score ?? '-';
  const isHome = normalizeTeam(home).toLowerCase() === normalizeTeam(teamName).toLowerCase();
  const opponent = isHome ? away : home;
  const venue = resultForTeam(m, teamName);
  const date = m.date || m.start_time || m.match_date || '';
  const comp = m.competition?.name || m.competition_name || m.stage || '';
  return {
    opponent,
    score: `${hs}-${as}`,
    venue,
    date: date ? String(date).slice(0, 10) : '',
    competition: comp,
  };
}

async function fetchRecentMatches (teamName, limit = 12) {
  const canonical = normalizeTeam(teamName);
  const data = await bsdFetch(
    `/events/?team_name=${encodeURIComponent(canonical)}&status=finished&limit=${limit}`
  );
  if (!data?.results?.length) {
    const data2 = await bsdFetch(
      `/events/?team_name=${encodeURIComponent(teamName)}&status=finished&limit=${limit}`
    );
    return data2?.results || [];
  }
  return data.results;
}

async function enrichWithLiveData (intel, teamName) {
  const matches = await fetchRecentMatches(teamName, 12);
  if (!matches.length) return intel;

  const results = matches.map(m => resultForTeam(m, teamName));
  const formExtended = results.join(' ');
  const streakLive = computeStreak(results);

  const friendliesLive = matches
    .filter(m => {
      const c = (m.competition?.name || m.competition_name || '').toLowerCase();
      return c.includes('friendly') || c.includes('amic') || c.includes('preparation');
    })
    .slice(0, 5)
    .map(m => formatMatchLine(m, teamName));

  return {
    ...intel,
    form_extended: formExtended,
    streak: streakLive || intel.streak,
    friendlies_live: friendliesLive.length ? friendliesLive : null,
    recent_matches: matches.slice(0, 8).map(m => formatMatchLine(m, teamName)),
  };
}

async function getTeamIntel (teamName) {
  const staticIntel = getStaticIntel(teamName);
  if (!staticIntel) {
    return { found: false, teamName };
  }

  let intel = { ...staticIntel };
  try {
    intel = await enrichWithLiveData(intel, teamName);
  } catch (e) {
    console.warn(`[teamIntel] live ${teamName}:`, e.message);
  }

  return intel;
}

async function fetchLiveH2H (teamA, teamB) {
  const matchesA = await fetchRecentMatches(teamA, 30);
  const canonB = normalizeTeam(teamB).toLowerCase();
  const canonA = normalizeTeam(teamA).toLowerCase();

  return matchesA.filter(m => {
    const home = normalizeTeam(m.home_team?.name || m.home_team || '').toLowerCase();
    const away = normalizeTeam(m.away_team?.name || m.away_team || '').toLowerCase();
    return (home === canonA && away === canonB) || (home === canonB && away === canonA);
  }).slice(0, 6).map(m => ({
    date: (m.date || m.start_time || '').toString().slice(0, 10),
    comp: m.competition?.name || m.competition_name || 'Match',
    score: `${m.home_score ?? '?'}-${m.away_score ?? '?'}`,
    note: `${m.home_team?.name || m.home_team} vs ${m.away_team?.name || m.away_team}`,
  }));
}

async function getH2H (teamA, teamB) {
  const staticH2H = getStaticH2H(teamA, teamB);
  let liveMeetings = [];

  try {
    liveMeetings = await fetchLiveH2H(teamA, teamB);
  } catch (e) {
    console.warn(`[h2h] live ${teamA} vs ${teamB}:`, e.message);
  }

  if (staticH2H) {
    return {
      ...staticH2H,
      live_meetings: liveMeetings.length ? liveMeetings : null,
    };
  }

  if (liveMeetings.length) {
    return {
      found: true,
      team_a: normalizeTeam(teamA),
      team_b: normalizeTeam(teamB),
      summary: `${liveMeetings.length} confrontation(s) récente(s) trouvée(s).`,
      meetings: liveMeetings,
      stats: null,
    };
  }

  return {
    found: false,
    team_a: teamA,
    team_b: teamB,
    summary: 'Aucune confrontation directe recensée.',
    meetings: [],
  };
}

module.exports = { getTeamIntel, getH2H };
