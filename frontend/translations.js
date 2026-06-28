const TEAMS = {
  // Amérique du Nord
  'Mexico':              { fr: 'Mexique',              flag: '🇲🇽' },
  'USA':                 { fr: 'États-Unis',            flag: '🇺🇸' },
  'United States':       { fr: 'États-Unis',            flag: '🇺🇸' },
  'Canada':              { fr: 'Canada',                flag: '🇨🇦' },
  'Costa Rica':          { fr: 'Costa Rica',            flag: '🇨🇷' },
  'Panama':              { fr: 'Panama',                flag: '🇵🇦' },
  'Honduras':            { fr: 'Honduras',              flag: '🇭🇳' },
  'Jamaica':             { fr: 'Jamaïque',              flag: '🇯🇲' },
  'Haiti':               { fr: 'Haïti',                 flag: '🇭🇹' },
  'Curaçao':             { fr: 'Curaçao',               flag: '🇨🇼' },
  'Curacao':             { fr: 'Curaçao',               flag: '🇨🇼' },
  'Trinidad and Tobago': { fr: 'Trinité-et-Tobago',    flag: '🇹🇹' },

  // Amérique du Sud
  'Brazil':              { fr: 'Brésil',                flag: '🇧🇷' },
  'Argentina':           { fr: 'Argentine',             flag: '🇦🇷' },
  'Colombia':            { fr: 'Colombie',              flag: '🇨🇴' },
  'Uruguay':             { fr: 'Uruguay',               flag: '🇺🇾' },
  'Ecuador':             { fr: 'Équateur',              flag: '🇪🇨' },
  'Chile':               { fr: 'Chili',                 flag: '🇨🇱' },
  'Peru':                { fr: 'Pérou',                 flag: '🇵🇪' },
  'Venezuela':           { fr: 'Venezuela',             flag: '🇻🇪' },
  'Bolivia':             { fr: 'Bolivie',               flag: '🇧🇴' },
  'Paraguay':            { fr: 'Paraguay',              flag: '🇵🇾' },

  // Europe
  'France':              { fr: 'France',                flag: '🇫🇷' },
  'Germany':             { fr: 'Allemagne',             flag: '🇩🇪' },
  'Spain':               { fr: 'Espagne',               flag: '🇪🇸' },
  'Portugal':            { fr: 'Portugal',              flag: '🇵🇹' },
  'England':             { fr: 'Angleterre',            flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Netherlands':         { fr: 'Pays-Bas',              flag: '🇳🇱' },
  'Belgium':             { fr: 'Belgique',              flag: '🇧🇪' },
  'Italy':               { fr: 'Italie',                flag: '🇮🇹' },
  'Croatia':             { fr: 'Croatie',               flag: '🇭🇷' },
  'Switzerland':         { fr: 'Suisse',                flag: '🇨🇭' },
  'Denmark':             { fr: 'Danemark',              flag: '🇩🇰' },
  'Poland':              { fr: 'Pologne',               flag: '🇵🇱' },
  'Serbia':              { fr: 'Serbie',                flag: '🇷🇸' },
  'Ukraine':             { fr: 'Ukraine',               flag: '🇺🇦' },
  'Sweden':              { fr: 'Suède',                 flag: '🇸🇪' },
  'Austria':             { fr: 'Autriche',              flag: '🇦🇹' },
  'Wales':               { fr: 'Pays de Galles',        flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  'Scotland':            { fr: 'Écosse',                flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  'Turkey':              { fr: 'Turquie',               flag: '🇹🇷' },
  'Türkiye':             { fr: 'Turquie',               flag: '🇹🇷' },
  'Czechia':             { fr: 'République tchèque',    flag: '🇨🇿' },
  'Czech Republic':      { fr: 'République tchèque',    flag: '🇨🇿' },
  'Hungary':             { fr: 'Hongrie',               flag: '🇭🇺' },
  'Romania':             { fr: 'Roumanie',              flag: '🇷🇴' },
  'Slovakia':            { fr: 'Slovaquie',             flag: '🇸🇰' },
  'Slovenia':            { fr: 'Slovénie',              flag: '🇸🇮' },
  'Greece':              { fr: 'Grèce',                 flag: '🇬🇷' },
  'Albania':             { fr: 'Albanie',               flag: '🇦🇱' },
  'Bosnia-Herzegovina':  { fr: 'Bosnie-Herzégovine',    flag: '🇧🇦' },
  'Bosnia & Herzegovina':{ fr: 'Bosnie-Herzégovine',    flag: '🇧🇦' },
  'North Macedonia':     { fr: 'Macédoine du Nord',     flag: '🇲🇰' },
  'Iceland':             { fr: 'Islande',               flag: '🇮🇸' },
  'Norway':              { fr: 'Norvège',               flag: '🇳🇴' },
  'Finland':             { fr: 'Finlande',              flag: '🇫🇮' },
  'Russia':              { fr: 'Russie',                flag: '🇷🇺' },
  'Ireland':             { fr: 'Irlande',               flag: '🇮🇪' },
  'Republic of Ireland': { fr: 'Irlande',               flag: '🇮🇪' },
  'Northern Ireland':    { fr: 'Irlande du Nord',       flag: '🇬🇧' },
  'Montenegro':          { fr: 'Monténégro',            flag: '🇲🇪' },
  'Gibraltar':           { fr: 'Gibraltar',             flag: '🇬🇮' },
  'Faroe Islands':       { fr: 'Îles Féroé',            flag: '🇫🇴' },
  'Luxembourg':          { fr: 'Luxembourg',            flag: '🇱🇺' },
  'Malta':               { fr: 'Malte',                 flag: '🇲🇹' },
  'Cyprus':              { fr: 'Chypre',                flag: '🇨🇾' },
  'Georgia':             { fr: 'Géorgie',               flag: '🇬🇪' },
  'Armenia':             { fr: 'Arménie',               flag: '🇦🇲' },
  'Belarus':             { fr: 'Biélorussie',           flag: '🇧🇾' },
  'Kosovo':              { fr: 'Kosovo',                flag: '🇽🇰' },
  'Bulgaria':            { fr: 'Bulgarie',              flag: '🇧🇬' },
  'Latvia':              { fr: 'Lettonie',              flag: '🇱🇻' },
  'Lithuania':           { fr: 'Lituanie',              flag: '🇱🇹' },
  'Estonia':             { fr: 'Estonie',               flag: '🇪🇪' },
  'Moldova':             { fr: 'Moldavie',              flag: '🇲🇩' },
  'Andorra':             { fr: 'Andorre',               flag: '🇦🇩' },
  'San Marino':          { fr: 'Saint-Marin',           flag: '🇸🇲' },
  'Liechtenstein':       { fr: 'Liechtenstein',         flag: '🇱🇮' },

  // Afrique
  'Morocco':             { fr: 'Maroc',                 flag: '🇲🇦' },
  'Senegal':             { fr: 'Sénégal',               flag: '🇸🇳' },
  'Nigeria':             { fr: 'Nigeria',               flag: '🇳🇬' },
  'Cameroon':            { fr: 'Cameroun',              flag: '🇨🇲' },
  'Ghana':               { fr: 'Ghana',                 flag: '🇬🇭' },
  'Egypt':               { fr: 'Égypte',                flag: '🇪🇬' },
  'Algeria':             { fr: 'Algérie',               flag: '🇩🇿' },
  'Tunisia':             { fr: 'Tunisie',               flag: '🇹🇳' },
  'South Africa':        { fr: 'Afrique du Sud',        flag: '🇿🇦' },
  'Ivory Coast':         { fr: 'Côte d\'Ivoire',        flag: '🇨🇮' },
  "Côte d'Ivoire":       { fr: 'Côte d\'Ivoire',        flag: '🇨🇮' },
  'Mali':                { fr: 'Mali',                  flag: '🇲🇱' },
  'DR Congo':            { fr: 'RD Congo',              flag: '🇨🇩' },
  'Congo DR':            { fr: 'RD Congo',              flag: '🇨🇩' },
  'Cape Verde Islands':  { fr: 'Cap-Vert',              flag: '🇨🇻' },
  'Cape Verde':          { fr: 'Cap-Vert',              flag: '🇨🇻' },
  'Cabo Verde':          { fr: 'Cap-Vert',              flag: '🇨🇻' },
  'Angola':              { fr: 'Angola',                flag: '🇦🇴' },
  'Zambia':              { fr: 'Zambie',                flag: '🇿🇲' },
  'Zimbabwe':            { fr: 'Zimbabwe',              flag: '🇿🇼' },
  'Kenya':               { fr: 'Kenya',                 flag: '🇰🇪' },
  'Uganda':              { fr: 'Ouganda',               flag: '🇺🇬' },
  'Benin':               { fr: 'Bénin',                 flag: '🇧🇯' },
  'Gabon':               { fr: 'Gabon',                 flag: '🇬🇦' },
  'Guinea':              { fr: 'Guinée',                flag: '🇬🇳' },
  'Burkina Faso':        { fr: 'Burkina Faso',          flag: '🇧🇫' },
  'Togo':                { fr: 'Togo',                  flag: '🇹🇬' },
  'Niger':               { fr: 'Niger',                 flag: '🇳🇪' },
  'Libya':               { fr: 'Libye',                 flag: '🇱🇾' },
  'Sudan':               { fr: 'Soudan',                flag: '🇸🇩' },
  'Ethiopia':            { fr: 'Éthiopie',              flag: '🇪🇹' },
  'Mozambique':          { fr: 'Mozambique',            flag: '🇲🇿' },
  'Namibia':             { fr: 'Namibie',               flag: '🇳🇦' },
  'Botswana':            { fr: 'Botswana',              flag: '🇧🇼' },
  'Madagascar':          { fr: 'Madagascar',            flag: '🇲🇬' },
  'Rwanda':              { fr: 'Rwanda',                flag: '🇷🇼' },
  'Burundi':             { fr: 'Burundi',               flag: '🇧🇮' },
  'Equatorial Guinea':   { fr: 'Guinée équatoriale',    flag: '🇬🇶' },
  'Gambia':              { fr: 'Gambie',                flag: '🇬🇲' },

  // Asie & Océanie
  'Japan':               { fr: 'Japon',                 flag: '🇯🇵' },
  'South Korea':         { fr: 'Corée du Sud',          flag: '🇰🇷' },
  'Korea Republic':      { fr: 'Corée du Sud',          flag: '🇰🇷' },
  'North Korea':         { fr: 'Corée du Nord',         flag: '🇰🇵' },
  'Saudi Arabia':        { fr: 'Arabie saoudite',       flag: '🇸🇦' },
  'Iran':                { fr: 'Iran',                  flag: '🇮🇷' },
  'IR Iran':             { fr: 'Iran',                  flag: '🇮🇷' },
  'Australia':           { fr: 'Australie',             flag: '🇦🇺' },
  'Qatar':               { fr: 'Qatar',                 flag: '🇶🇦' },
  'China':               { fr: 'Chine',                 flag: '🇨🇳' },
  'China PR':            { fr: 'Chine',                 flag: '🇨🇳' },
  'Indonesia':           { fr: 'Indonésie',             flag: '🇮🇩' },
  'New Zealand':         { fr: 'Nouvelle-Zélande',      flag: '🇳🇿' },
  'United Arab Emirates':{ fr: 'Émirats arabes unis',   flag: '🇦🇪' },
  'Iraq':                { fr: 'Irak',                  flag: '🇮🇶' },
  'Jordan':              { fr: 'Jordanie',              flag: '🇯🇴' },
  'Kuwait':              { fr: 'Koweït',                flag: '🇰🇼' },
  'Oman':                { fr: 'Oman',                  flag: '🇴🇲' },
  'Palestine':           { fr: 'Palestine',             flag: '🇵🇸' },
  'Syria':               { fr: 'Syrie',                 flag: '🇸🇾' },
  'Lebanon':             { fr: 'Liban',                 flag: '🇱🇧' },
  'Bahrain':             { fr: 'Bahreïn',               flag: '🇧🇭' },
  'Yemen':               { fr: 'Yémen',                 flag: '🇾🇪' },
  'Uzbekistan':          { fr: 'Ouzbékistan',           flag: '🇺🇿' },
  'Thailand':            { fr: 'Thaïlande',             flag: '🇹🇭' },
  'Vietnam':             { fr: 'Viêt Nam',              flag: '🇻🇳' },
  'India':               { fr: 'Inde',                  flag: '🇮🇳' },
  'Malaysia':            { fr: 'Malaisie',              flag: '🇲🇾' },
  'Singapore':           { fr: 'Singapour',             flag: '🇸🇬' },
  'Philippines':         { fr: 'Philippines',           flag: '🇵🇭' },
  'Kyrgyzstan':          { fr: 'Kirghizistan',          flag: '🇰🇬' },
  'Tajikistan':          { fr: 'Tadjikistan',           flag: '🇹🇯' },
  'Turkmenistan':        { fr: 'Turkménistan',          flag: '🇹🇲' },
  'Afghanistan':         { fr: 'Afghanistan',           flag: '🇦🇫' },
  'Pakistan':            { fr: 'Pakistan',              flag: '🇵🇰' },
  'Bangladesh':          { fr: 'Bangladesh',            flag: '🇧🇩' },
  'Hong Kong':           { fr: 'Hong Kong',             flag: '🇭🇰' },
  'Chinese Taipei':      { fr: 'Taïwan',                flag: '🇹🇼' },
};

const TEAM_ALIASES = {
  usa: 'United States',
  'bosnia and herzegovina': 'Bosnia-Herzegovina',
  'czech republic': 'Czechia',
  czechoslovakia: 'Czechia',
};

const STAGES = {
  'GROUP_STAGE':          'Phase de groupes',
  'LAST_32':              '16èmes de finale',
  'ROUND_OF_32':          '16èmes de finale',
  'LAST_16':              'Huitièmes de finale',
  'ROUND_OF_16':          'Huitièmes de finale',
  'QUARTER_FINALS':       'Quarts de finale',
  'SEMI_FINALS':          'Demi-finales',
  'THIRD_PLACE':          'Match pour la 3e place',
  'FINAL':                'Finale',
};

function resolveTeamKey (name) {
  if (!name) return null;
  if (TEAMS[name]) return name;

  const alias = TEAM_ALIASES[name.toLowerCase()];
  if (alias && TEAMS[alias]) return alias;

  const lower = name.toLowerCase();
  const key = Object.keys(TEAMS).find(k => k.toLowerCase() === lower);
  return key || name;
}

function teamName (name) {
  const key = resolveTeamKey(name);
  return TEAMS[key]?.fr || name;
}

function flagEmoji (name) {
  const key = resolveTeamKey(name);
  return TEAMS[key]?.flag || '🏳️';
}

/** Remplace les noms anglais connus dans un texte (résumés H2H, notes…). */
function translateTeamsInText (text) {
  if (!text) return text;
  let out = text;
  const entries = Object.entries(TEAMS)
    .filter(([en, { fr }]) => en !== fr)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [en, { fr }] of entries) {
    out = out.split(en).join(fr);
  }
  return out;
}

function stageName (stage, group) {
  if (group) return `Groupe ${group}`;
  return STAGES[stage] || stage || 'Autre';
}
