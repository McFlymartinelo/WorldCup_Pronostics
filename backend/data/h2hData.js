'use strict';

/**
 * Confrontations directes historiques (CdM + qualifications + amicaux marquants).
 * Clé = "Équipe A|Équipe B" (ordre alphabétique).
 */
const H2H = {
  'Argentina|France': {
    summary: '3 matchs en CdM — France mène au bilan global.',
    meetings: [
      { date: '2022', comp: 'CdM', score: '3-3 (3-4 t.a.b.)', note: 'Finale — Argentine championne' },
      { date: '2018', comp: 'Amical', score: '2-0', note: 'Victoire France' },
      { date: '1978', comp: 'CdM', score: '2-1', note: 'Victoire Argentine' },
    ],
    stats: { played: 12, wins_a: 4, wins_b: 6, draws: 2 },
  },
  'Brazil|France': {
    summary: 'Rivalité historique — 4 finales de CdM possibles.',
    meetings: [
      { date: '2022', comp: 'Amical', score: '1-0', note: 'Victoire France' },
      { date: '2006', comp: 'CdM', score: '1-0', note: 'Victoire France (quarts)' },
      { date: '1998', comp: 'CdM', score: '3-0', note: 'Victoire France (finale)' },
      { date: '1986', comp: 'CdM', score: '1-1', note: 'Tirs au but — France' },
    ],
    stats: { played: 15, wins_a: 7, wins_b: 5, draws: 3 },
  },
  'Mexico|South Africa': {
    summary: 'Première confrontation officielle en CdM 2026 (match d\'ouverture).',
    meetings: [
      { date: '2010', comp: 'Amical', score: '2-0', note: 'Victoire Mexique' },
    ],
    stats: { played: 1, wins_a: 1, wins_b: 0, draws: 0 },
  },
  'Mexico|United States': {
    summary: 'Rivalité CONCACAF — matchs très disputés.',
    meetings: [
      { date: '2024', comp: 'CONCACAF', score: '2-0', note: 'Victoire USA' },
      { date: '2023', comp: 'Amical', score: '3-3', note: 'Match nul' },
      { date: '2022', comp: 'Qualif.', score: '0-0', note: 'Match nul' },
    ],
    stats: { played: 76, wins_a: 19, wins_b: 37, draws: 20 },
  },
  'Canada|United States': {
    summary: 'Frontière nord-américaine — intensité croissante.',
    meetings: [
      { date: '2024', comp: 'CONCACAF', score: '2-0', note: 'Victoire USA' },
      { date: '2023', comp: 'Amical', score: '2-1', note: 'Victoire USA' },
    ],
    stats: { played: 40, wins_a: 9, wins_b: 22, draws: 9 },
  },
  'England|United States': {
    summary: 'Angleterre domine historiquement.',
    meetings: [
      { date: '2022', comp: 'CdM', score: '0-0', note: 'Match nul en poule' },
      { date: '2010', comp: 'CdM', score: '1-1', note: 'Match nul' },
      { date: '1950', comp: 'CdM', score: '1-0', note: 'Surprise USA' },
    ],
    stats: { played: 12, wins_a: 8, wins_b: 2, draws: 2 },
  },
  'Germany|Spain': {
    summary: 'Classique européen — équilibre récent.',
    meetings: [
      { date: '2023', comp: 'Amical', score: '2-1', note: 'Victoire Espagne' },
      { date: '2010', comp: 'CdM', score: '1-0', note: 'Victoire Espagne (demi)' },
    ],
    stats: { played: 26, wins_a: 10, wins_b: 11, draws: 5 },
  },
  'Morocco|Brazil': {
    summary: 'Peu de confrontations — styles opposés.',
    meetings: [
      { date: '1998', comp: 'CdM', score: '3-0', note: 'Victoire Brésil' },
    ],
    stats: { played: 2, wins_a: 0, wins_b: 2, draws: 0 },
  },
  'Japan|South Korea': {
    summary: 'Derby d\'Asie de l\'Est — rivalité historique.',
    meetings: [
      { date: '2024', comp: 'Amical', score: '1-0', note: 'Victoire Japon' },
      { date: '2022', comp: 'Amical', score: '2-2', note: 'Match nul' },
    ],
    stats: { played: 81, wins_a: 42, wins_b: 15, draws: 24 },
  },
  'Portugal|Spain': {
    summary: 'Derby ibérique — matchs serrés.',
    meetings: [
      { date: '2024', comp: 'Euro', score: '0-0', note: 'Portugal éliminée t.a.b.' },
      { date: '2018', comp: 'CdM', score: '3-3', note: 'Match nul mémorable' },
    ],
    stats: { played: 40, wins_a: 6, wins_b: 17, draws: 17 },
  },
};

function h2hKey (teamA, teamB) {
  const { resolveTeamKey } = require('./teamIntelData');
  const a = resolveTeamKey(teamA) || teamA;
  const b = resolveTeamKey(teamB) || teamB;
  return [a, b].sort((x, y) => x.localeCompare(y)).join('|');
}

function getStaticH2H (teamA, teamB) {
  const key = h2hKey(teamA, teamB);
  const data = H2H[key];
  if (!data) return null;
  const [a, b] = key.split('|');
  return { ...data, team_a: a, team_b: b, found: true };
}

module.exports = { getStaticH2H, h2hKey };
