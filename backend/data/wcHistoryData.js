'use strict';

/** Palmarès CdM — données historiques non disponibles via les APIs live. */
const WC_HISTORY = {
  France: {
    best_wc: 'Champion (1998, 2018)',
    wc_2018: 'Champion',
    wc_2022: 'Finaliste',
    history: "Double champion du monde, finaliste en 2022. L'une des références mondiales.",
  },
  Brazil: {
    best_wc: 'Champion (5 titres — record)',
    wc_2018: 'Quarts de finale',
    wc_2022: 'Quarts de finale',
    history: '5 titres mondiaux. La Seleção reste la nation la plus titrée.',
  },
  Argentina: {
    best_wc: 'Champion (2022, 1986, 1978)',
    wc_2018: 'Huitième de finale',
    wc_2022: 'Champion',
    history: 'Champion du monde en titre. Messi a soulevé le trophée en 2022.',
  },
  Germany: {
    best_wc: 'Champion (4 titres — 1954, 74, 90, 2014)',
    wc_2018: 'Premier tour (éliminé)',
    wc_2022: 'Huitième de finale',
    history: '4 fois champion du monde, 8 finales disputées.',
  },
  Spain: {
    best_wc: 'Champion (2010)',
    wc_2018: 'Huitième de finale',
    wc_2022: 'Huitième de finale',
    history: "Champion 2010, triple champion d'Europe récent.",
  },
  England: {
    best_wc: 'Champion (1966)',
    wc_2018: 'Demi-finale',
    wc_2022: 'Quarts de finale',
    history: 'Champion 1966, demi-finaliste 2018 et finaliste Euro 2020/2024.',
  },
  'United States': {
    best_wc: '3e (1930)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Huitième de finale',
    history: 'Co-organisateur 2026. Meilleur résultat : demi-finale 1930.',
  },
  Mexico: {
    best_wc: 'Quarts de finale (1970, 1986)',
    wc_2018: 'Premier tour',
    wc_2022: 'Premier tour',
    history: 'Co-organisateur 2026. 17 participations consécutives en CdM.',
  },
  Canada: {
    best_wc: 'Premier tour (1986)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Premier tour',
    history: 'Co-organisateur 2026. Nation en forte progression depuis 2022.',
  },
  Morocco: {
    best_wc: 'Demi-finale (2022)',
    wc_2018: 'Premier tour',
    wc_2022: 'Demi-finale (4e)',
    history: 'Première nation africaine en demi-finale de CdM (2022).',
  },
  Japan: {
    best_wc: 'Huitième de finale (2002, 2010, 2022)',
    wc_2018: 'Huitième de finale',
    wc_2022: 'Huitième de finale (victoire vs Allemagne & Espagne)',
    history: "Référence asiatique, victoire historique sur l'Allemagne en 2022.",
  },
  Portugal: {
    best_wc: '3e (1966)',
    wc_2018: 'Huitième de finale',
    wc_2022: 'Quarts de finale',
    history: "Champion d'Europe 2016. Ronaldo en quête d'un premier titre mondial.",
  },
  Netherlands: {
    best_wc: 'Finaliste (1974, 1978, 2010)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Quarts de finale',
    history: 'Football total, 3 finales perdues. Toujours candidat.',
  },
  Croatia: {
    best_wc: 'Finaliste (2018)',
    wc_2018: 'Finaliste',
    wc_2022: '3e place',
    history: 'Finaliste 2018, 3e en 2022. Petite nation, grands résultats.',
  },
  Belgium: {
    best_wc: '3e (2018)',
    wc_2018: '3e place',
    wc_2022: 'Huitième de finale',
    history: 'Génération dorée, 3e en 2018. Dernière danse pour plusieurs cadres.',
  },
  Switzerland: {
    best_wc: 'Quarts de finale (1934, 38, 54)',
    wc_2018: 'Huitième de finale',
    wc_2022: 'Huitième de finale',
    history: 'Régulier en phase finale depuis 2006.',
  },
  'South Korea': {
    best_wc: '4e (2002)',
    wc_2018: 'Premier tour',
    wc_2022: 'Huitième de finale',
    history: 'Demi-finaliste 2002 à domicile avec Bielsa puis Klinsmann.',
  },
  Senegal: {
    best_wc: 'Quarts de finale (2002)',
    wc_2018: 'Premier tour',
    wc_2022: 'Huitième de finale',
    history: "Champion d'Afrique 2021. Lions de la Teranga.",
  },
  Colombia: {
    best_wc: 'Quarts de finale (2014)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: 'Retour en CdM après absence 2018/2022. James, star de 2014.',
  },
  Uruguay: {
    best_wc: 'Champion (1930, 1950)',
    wc_2018: 'Quarts de finale',
    wc_2022: 'Premier tour',
    history: '2 titres mondiaux, nation historique du football.',
  },
  Scotland: {
    best_wc: 'Premier tour (1954, 78, 82, 86, 90, 98)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: "Retour en CdM après 28 ans d'absence. Nation fondatrice du football.",
  },
  Norway: {
    best_wc: 'Huitième de finale (1998)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: 'Retour historique avec Haaland et Ødegaard.',
  },
  'Bosnia-Herzegovina': {
    best_wc: 'Premier tour (2014)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: '2e participation après 2014. Džeko emblématique.',
  },
  Czechia: {
    best_wc: 'Finaliste (1962, Tchécoslovaquie)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: 'Retour après longue absence. Schick buteur en Euro 2020.',
  },
  Haiti: {
    best_wc: 'Premier tour (1974)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: 'Retour historique 52 ans après 1974.',
  },
  'Cape Verde Islands': {
    best_wc: 'Première participation',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: 'Première qualification en Coupe du Monde.',
  },
  Curaçao: {
    best_wc: 'Première participation',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: 'Première qualification historique pour la petite île caribéenne.',
  },
  Qatar: {
    best_wc: 'Premier tour (2022 — hôte)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Premier tour (hôte)',
    history: 'Hôte 2022, éliminé au 1er tour. Progression constante.',
  },
  'South Africa': {
    best_wc: 'Premier tour (2002, 2010)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: 'Hôte 2010. Bafana Bafana de retour.',
  },
  Tunisia: {
    best_wc: 'Premier tour (1978, 98, 2002, 06, 18, 22)',
    wc_2018: 'Premier tour',
    wc_2022: 'Premier tour (victoire vs France)',
    history: '6e participation. Victoire mémorable vs France en 2022.',
  },
  'New Zealand': {
    best_wc: 'Premier tour (1982, 2010)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: "All Whites qualifiés via l'OFC.",
  },
  Jordan: {
    best_wc: 'Première participation',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: "Finaliste de la Coupe d'Asie 2023, première CdM.",
  },
  Uzbekistan: {
    best_wc: 'Première participation',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: "Première qualification historique pour l'Asie centrale.",
  },
  Paraguay: {
    best_wc: 'Quarts de finale (2010)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: 'Retour en CdM après 12 ans.',
  },
  Egypt: {
    best_wc: 'Premier tour (1990, 2018, 2022)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Premier tour',
    history: "7 titres africains. Salah moteur de l'équipe.",
  },
  Algeria: {
    best_wc: 'Huitième de finale (2014)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Non qualifié',
    history: "Champion d'Afrique 2019. Retour après absence 2022.",
  },
  Australia: {
    best_wc: 'Huitième de finale (2006, 2022)',
    wc_2018: 'Premier tour',
    wc_2022: 'Huitième de finale (victoire vs Argentine en poule)',
    history: 'Socceroos réguliers en CdM, huitième en 2022.',
  },
  'Saudi Arabia': {
    best_wc: 'Huitième de finale (1994)',
    wc_2018: 'Premier tour',
    wc_2022: 'Premier tour (victoire vs Argentine)',
    history: 'Victoire historique vs Argentine en 2022.',
  },
  'Ivory Coast': {
    best_wc: 'Premier tour (2006, 2010, 2014)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Premier tour',
    history: "Champion d'Afrique 2023. Éléphants de retour.",
  },
  Ghana: {
    best_wc: 'Quarts de finale (2010)',
    wc_2018: 'Premier tour',
    wc_2022: 'Premier tour',
    history: 'Quarts 2010 avec la main de Suárez. Black Stars.',
  },
  Ecuador: {
    best_wc: 'Huitième de finale (2006)',
    wc_2018: 'Non qualifié',
    wc_2022: 'Premier tour',
    history: 'La Tri, régulière en CONMEBOL.',
  },
  Iran: {
    best_wc: 'Premier tour (1978, 98, 2006, 2014, 2018, 2022)',
    wc_2018: 'Premier tour',
    wc_2022: 'Premier tour',
    history: 'Team Melli, 6 participations consécutives.',
  },
  Panama: {
    best_wc: 'Premier tour (2018)',
    wc_2018: 'Premier tour',
    wc_2022: 'Non qualifié',
    history: '2e participation après 2018.',
  },
};

function getWcHistory (teamName) {
  const key = teamName;
  if (WC_HISTORY[key]) return WC_HISTORY[key];
  const found = Object.keys(WC_HISTORY).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? WC_HISTORY[found] : null;
}

module.exports = { WC_HISTORY, getWcHistory };
