'use strict';

/**
 * Alias football-data.org / BSD → nom canonique.
 */
const ALIASES = {
  'usa': 'United States',
  'united states': 'United States',
  'czechia': 'Czechia',
  'czech republic': 'Czechia',
  'bosnia-herzegovina': 'Bosnia-Herzegovina',
  'bosnia & herzegovina': 'Bosnia-Herzegovina',
  'cabo verde': 'Cape Verde Islands',
  'cape verde': 'Cape Verde Islands',
  'cape verde islands': 'Cape Verde Islands',
  "côte d'ivoire": 'Ivory Coast',
  'ivory coast': 'Ivory Coast',
  'curacao': 'Curaçao',
  'curaçao': 'Curaçao',
  'south korea': 'South Korea',
  'korea republic': 'South Korea',
  'türkiye': 'Turkey',
  'turkey': 'Turkey',
  'congo dr': 'Congo DR',
  'dr congo': 'Congo DR',
  'ir iran': 'Iran',
  'iran': 'Iran',
};

/** @deprecated Utiliser teamIntelBuilder.resolveTeamKey — conservé pour compatibilité sync. */
function resolveTeamKey (name) {
  if (!name) return null;
  const alias = ALIASES[name.toLowerCase()];
  return alias || name;
}

module.exports = { ALIASES, resolveTeamKey };
