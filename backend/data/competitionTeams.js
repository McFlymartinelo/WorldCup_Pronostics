'use strict';

/** Mapping sélections BSD (team_name → team_id). Source unique pour la liste des nations. */
const MANUAL_TEAM_MAP = {
  'Argentina':           489,
  'Austria':             483,
  'Belgium':             477,
  'Bosnia-Herzegovina':  931,
  'Brazil':              463,
  'Canada':              455,
  'Cape Verde Islands':  476,
  'Cabo Verde':          476,
  'Colombia':            498,
  'Congo DR':            648,
  'Croatia':             494,
  'Curaçao':             468,
  'Curacao':             468,
  'Egypt':               478,
  'England':             493,
  'France':              485,
  'Germany':             467,
  'Haiti':               465,
  'Ivory Coast':         471,
  "Côte d'Ivoire":       471,
  'Japan':               470,
  'Mexico':              null,
  'Morocco':             464,
  'Netherlands':         469,
  'New Zealand':         482,
  'Norway':              488,
  'Panama':              496,
  'Portugal':            491,
  'Scotland':            466,
  'Senegal':             486,
  'South Africa':        452,
  'South Korea':         453,
  'Spain':               475,
  'Sweden':              731,
  'Switzerland':         462,
  'Tunisia':             474,
  'United States':       457,
  'USA':                 457,
  'Algeria':             null,
  'Australia':           null,
  'Bosnia & Herzegovina': 931,
  'Ecuador':             null,
  'Ghana':               null,
  'Iran':                null,
  'Iraq':                null,
  'Jordan':              null,
  'Paraguay':            null,
  'Qatar':               null,
  'Saudi Arabia':        479,
  'Turkey':              null,
  'Türkiye':             null,
  'Uruguay':             null,
  'Uzbekistan':          null,
};

function getCompetitionTeamNames () {
  return [...new Set(Object.keys(MANUAL_TEAM_MAP))].sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
}

module.exports = { MANUAL_TEAM_MAP, getCompetitionTeamNames };
