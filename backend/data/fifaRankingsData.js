'use strict';

/**
 * Classement FIFA masculin — mise à jour du 1er avril 2026.
 * Source : FIFA/Coca-Cola Men's World Ranking (non disponible via FOOTBALL_API_KEY / BSD_API_KEY).
 */
const FIFA_RANKINGS = {
  France: 1,
  Spain: 2,
  Argentina: 3,
  England: 4,
  Portugal: 5,
  Brazil: 6,
  Netherlands: 7,
  Morocco: 8,
  Belgium: 9,
  Germany: 10,
  Croatia: 11,
  Colombia: 13,
  Senegal: 14,
  Mexico: 15,
  'United States': 16,
  Uruguay: 17,
  Japan: 18,
  Switzerland: 19,
  Iran: 21,
  Turkey: 22,
  Türkiye: 22,
  Ecuador: 23,
  Austria: 24,
  'South Korea': 25,
  Australia: 27,
  Algeria: 28,
  Egypt: 29,
  Canada: 30,
  Norway: 31,
  Panama: 33,
  'Ivory Coast': 34,
  Sweden: 38,
  Paraguay: 40,
  Czechia: 41,
  Scotland: 43,
  Tunisia: 44,
  'Congo DR': 46,
  Uzbekistan: 50,
  Qatar: 55,
  Iraq: 57,
  'South Africa': 60,
  'Saudi Arabia': 61,
  Jordan: 63,
  'Bosnia-Herzegovina': 65,
  'Cape Verde Islands': 69,
  Ghana: 74,
  Curaçao: 82,
  Haiti: 83,
  'New Zealand': 85,
};

const ALIAS_TO_CANONICAL = {
  usa: 'United States',
  'united states': 'United States',
  'korea republic': 'South Korea',
  'south korea': 'South Korea',
  'ivory coast': 'Ivory Coast',
  "côte d'ivoire": 'Ivory Coast',
  'cabo verde': 'Cape Verde Islands',
  'cape verde': 'Cape Verde Islands',
  'cape verde islands': 'Cape Verde Islands',
  'dr congo': 'Congo DR',
  'congo dr': 'Congo DR',
  'bosnia & herzegovina': 'Bosnia-Herzegovina',
  'bosnia-herzegovina': 'Bosnia-Herzegovina',
  curacao: 'Curaçao',
  curaçao: 'Curaçao',
  türkiye: 'Turkey',
  turkey: 'Turkey',
  'ir iran': 'Iran',
};

function resolveRankingKey (name) {
  if (!name) return null;
  if (FIFA_RANKINGS[name] != null) return name;
  const alias = ALIAS_TO_CANONICAL[name.toLowerCase()];
  if (alias && FIFA_RANKINGS[alias] != null) return alias;
  const found = Object.keys(FIFA_RANKINGS).find(
    k => k.toLowerCase() === name.toLowerCase()
  );
  return found || null;
}

function getFifaRank (teamName) {
  const key = resolveRankingKey(teamName);
  return key ? FIFA_RANKINGS[key] : null;
}

module.exports = { FIFA_RANKINGS, getFifaRank, resolveRankingKey };
