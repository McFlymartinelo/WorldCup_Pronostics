const TEAMS = {
  // Amérique du Nord
  'Mexico':              { fr: 'Mexique',           flag: '🇲🇽' },
  'USA':                 { fr: 'États-Unis',         flag: '🇺🇸' },
  'Canada':              { fr: 'Canada',             flag: '🇨🇦' },
  'Costa Rica':          { fr: 'Costa Rica',         flag: '🇨🇷' },
  'Panama':              { fr: 'Panama',             flag: '🇵🇦' },
  'Honduras':            { fr: 'Honduras',           flag: '🇭🇳' },
  'Jamaica':             { fr: 'Jamaïque',           flag: '🇯🇲' },

  // Amérique du Sud
  'Brazil':              { fr: 'Brésil',             flag: '🇧🇷' },
  'Argentina':           { fr: 'Argentine',          flag: '🇦🇷' },
  'Colombia':            { fr: 'Colombie',           flag: '🇨🇴' },
  'Uruguay':             { fr: 'Uruguay',            flag: '🇺🇾' },
  'Ecuador':             { fr: 'Équateur',           flag: '🇪🇨' },
  'Chile':               { fr: 'Chili',              flag: '🇨🇱' },
  'Peru':                { fr: 'Pérou',              flag: '🇵🇪' },
  'Venezuela':           { fr: 'Venezuela',          flag: '🇻🇪' },
  'Bolivia':             { fr: 'Bolivie',            flag: '🇧🇴' },
  'Paraguay':            { fr: 'Paraguay',           flag: '🇵🇾' },

  // Europe
  'France':              { fr: 'France',             flag: '🇫🇷' },
  'Germany':             { fr: 'Allemagne',          flag: '🇩🇪' },
  'Spain':               { fr: 'Espagne',            flag: '🇪🇸' },
  'Portugal':            { fr: 'Portugal',           flag: '🇵🇹' },
  'England':             { fr: 'Angleterre',         flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Netherlands':         { fr: 'Pays-Bas',           flag: '🇳🇱' },
  'Belgium':             { fr: 'Belgique',           flag: '🇧🇪' },
  'Italy':               { fr: 'Italie',             flag: '🇮🇹' },
  'Croatia':             { fr: 'Croatie',            flag: '🇭🇷' },
  'Switzerland':         { fr: 'Suisse',             flag: '🇨🇭' },
  'Denmark':             { fr: 'Danemark',           flag: '🇩🇰' },
  'Poland':              { fr: 'Pologne',            flag: '🇵🇱' },
  'Serbia':              { fr: 'Serbie',             flag: '🇷🇸' },
  'Ukraine':             { fr: 'Ukraine',            flag: '🇺🇦' },
  'Sweden':              { fr: 'Suède',              flag: '🇸🇪' },
  'Austria':             { fr: 'Autriche',           flag: '🇦🇹' },
  'Wales':               { fr: 'Pays de Galles',     flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  'Scotland':            { fr: 'Écosse',             flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  'Turkey':              { fr: 'Turquie',            flag: '🇹🇷' },
  'Czechia':             { fr: 'République tchèque', flag: '🇨🇿' },
  'Czech Republic':      { fr: 'République tchèque', flag: '🇨🇿' },
  'Hungary':             { fr: 'Hongrie',            flag: '🇭🇺' },
  'Romania':             { fr: 'Roumanie',           flag: '🇷🇴' },
  'Slovakia':            { fr: 'Slovaquie',          flag: '🇸🇰' },
  'Slovenia':            { fr: 'Slovénie',           flag: '🇸🇮' },
  'Greece':              { fr: 'Grèce',              flag: '🇬🇷' },
  'Albania':             { fr: 'Albanie',            flag: '🇦🇱' },
  'Bosnia-Herzegovina':  { fr: 'Bosnie',             flag: '🇧🇦' },
  'North Macedonia':     { fr: 'Macédoine du Nord',  flag: '🇲🇰' },
  'Iceland':             { fr: 'Islande',            flag: '🇮🇸' },
  'Norway':              { fr: 'Norvège',            flag: '🇳🇴' },
  'Finland':             { fr: 'Finlande',           flag: '🇫🇮' },
  'Russia':              { fr: 'Russie',             flag: '🇷🇺' },

  // Afrique
  'Morocco':             { fr: 'Maroc',              flag: '🇲🇦' },
  'Senegal':             { fr: 'Sénégal',            flag: '🇸🇳' },
  'Nigeria':             { fr: 'Nigeria',            flag: '🇳🇬' },
  'Cameroon':            { fr: 'Cameroun',           flag: '🇨🇲' },
  'Ghana':               { fr: 'Ghana',              flag: '🇬🇭' },
  'Egypt':               { fr: 'Égypte',             flag: '🇪🇬' },
  'Algeria':             { fr: 'Algérie',            flag: '🇩🇿' },
  'Tunisia':             { fr: 'Tunisie',            flag: '🇹🇳' },
  'South Africa':        { fr: 'Afrique du Sud',     flag: '🇿🇦' },
  'Ivory Coast':         { fr: 'Côte d\'Ivoire',     flag: '🇨🇮' },
  "Côte d'Ivoire":       { fr: 'Côte d\'Ivoire',     flag: '🇨🇮' },
  'Mali':                { fr: 'Mali',               flag: '🇲🇱' },
  'DR Congo':            { fr: 'RD Congo',           flag: '🇨🇩' },

  // Asie
  'Japan':               { fr: 'Japon',              flag: '🇯🇵' },
  'South Korea':         { fr: 'Corée du Sud',       flag: '🇰🇷' },
  'Saudi Arabia':        { fr: 'Arabie Saoudite',    flag: '🇸🇦' },
  'Iran':                { fr: 'Iran',               flag: '🇮🇷' },
  'Australia':           { fr: 'Australie',          flag: '🇦🇺' },
  'Qatar':               { fr: 'Qatar',              flag: '🇶🇦' },
  'China':               { fr: 'Chine',              flag: '🇨🇳' },
  'Indonesia':           { fr: 'Indonésie',          flag: '🇮🇩' },
  'New Zealand':         { fr: 'Nouvelle-Zélande',   flag: '🇳🇿' },
  'United Arab Emirates':{ fr: 'Émirats arabes unis',flag: '🇦🇪' },

  // Autres
  'Costa Rica':          { fr: 'Costa Rica',         flag: '🇨🇷' },
};

const STAGES = {
  'GROUP_STAGE':          'Phase de groupes',
  'ROUND_OF_16':          'Huitièmes de finale',
  'QUARTER_FINALS':       'Quarts de finale',
  'SEMI_FINALS':          'Demi-finales',
  'THIRD_PLACE':          'Match pour la 3e place',
  'FINAL':                'Finale',
};

function teamName(name) {
  return TEAMS[name]?.fr || name;
}

function flagEmoji(name) {
  return TEAMS[name]?.flag || '🏳️';
}

function stageName(stage, group) {
  if (group) return `Groupe ${group}`;
  return STAGES[stage] || stage || 'Autre';
}