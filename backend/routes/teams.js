'use strict';
const express         = require('express');
const { requireAuth } = require('../middleware/auth');
const fetch           = require('node-fetch');

const router  = express.Router();
const BASE    = 'https://sports.bzzoiro.com/api/v2';
const headers = { 'Authorization': `Token ${process.env.BSD_API_KEY}` };

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`BSD ${res.status}: ${path}`);
  return res.json();
}

// Données statiques enrichies par équipe pour la CdM 2026
const TEAM_DATA = {
  'France':        { history: 'Champion du monde 1998 et 2018. L\'une des nations les plus titrées d\'Europe.', best: 'Kylian Mbappé', capped: 'Lilian Thuram (142 sél.)', scorer: 'Thierry Henry (51 buts)' },
  'Brazil':        { history: 'Record absolu avec 5 titres mondiaux (1958, 62, 70, 94, 2002). La Seleção.', best: 'Vinícius Jr', capped: 'Cafu (142 sél.)', scorer: 'Pelé (77 buts)' },
  'Argentina':     { history: 'Champions du monde 1978, 1986 et 2022. Patrie de Messi et Maradona.', best: 'Lionel Messi', capped: 'Javier Mascherano (147 sél.)', scorer: 'Lionel Messi (109 buts)' },
  'Germany':       { history: '4 titres mondiaux (1954, 74, 90, 2014). Finaliste record avec 8 finales.', best: 'Florian Wirtz', capped: 'Lothar Matthäus (150 sél.)', scorer: 'Miroslav Klose (71 buts)' },
  'Spain':         { history: 'Champion du monde 2010, triples champions d\'Europe (1964, 2008, 2012, 2024).', best: 'Pedri', capped: 'Sergio Ramos (180 sél.)', scorer: 'David Villa (59 buts)' },
  'England':       { history: 'Vainqueur de la seule Coupe du Monde à domicile en 1966. Berceau du football.', best: 'Jude Bellingham', capped: 'Peter Shilton (125 sél.)', scorer: 'Wayne Rooney (53 buts)' },
  'Portugal':      { history: 'Champion d\'Europe 2016. Génération dorée portée par Cristiano Ronaldo.', best: 'Cristiano Ronaldo', capped: 'Cristiano Ronaldo (214 sél.)', scorer: 'Cristiano Ronaldo (135 buts)' },
  'Netherlands':   { history: 'Finaliste en 1974, 78 et 2010. Inventeurs du football total.', best: 'Virgil van Dijk', capped: 'Edwin van der Sar (130 sél.)', scorer: 'Robin van Persie (50 buts)' },
  'Belgium':       { history: 'Génération dorée des années 2010-2020, 3e en 2018. Record FIFA n°1 mondial.', best: 'Kevin De Bruyne', capped: 'Jan Vertonghen (150 sél.)', scorer: 'Romelu Lukaku (85 buts)' },
  'Croatia':       { history: 'Finaliste en 2018, 3e en 2022. Petite nation au grand palmarès.', best: 'Luka Modrić', capped: 'Luka Modrić (180 sél.)', scorer: 'Davor Šuker (45 buts)' },
  'Morocco':       { history: 'Demi-finaliste historique en 2022. Premier pays africain en demi-finale.', best: 'Achraf Hakimi', capped: 'Noureddine Naybet (115 sél.)', scorer: 'Hicham Zerouali (18 buts)' },
  'Senegal':       { history: 'Champion d\'Afrique 2021 et 2022. Quart de finaliste en 2002.', best: 'Sadio Mané', capped: 'Sadio Mané (99 sél.)', scorer: 'Sadio Mané (34 buts)' },
  'Japan':         { history: 'Meilleure nation asiatique, 6 qualifications consécutives en Coupe du Monde.', best: 'Takefusa Kubo', capped: 'Yasuhito Endo (152 sél.)', scorer: 'Kunishige Kamamoto (75 buts)' },
  'South Korea':   { history: 'Demi-finaliste surprise en 2002 à domicile. Puissance émergente d\'Asie.', best: 'Son Heung-min', capped: 'Cha Bum-kun (136 sél.)', scorer: 'Cha Bum-kun (58 buts)' },
  'USA':           { history: 'Co-organisateur de la CdM 2026. Huitième de finaliste en 2022.', best: 'Christian Pulisic', capped: 'Cobi Jones (164 sél.)', scorer: 'Landon Donovan (57 buts)' },
  'Mexico':        { history: '3e en 1986, co-organisateur 2026. 16e de finaliste en 7 CdM consécutives.', best: 'Hirving Lozano', capped: 'Claudio Suárez (177 sél.)', scorer: 'Javier Hernández (52 buts)' },
  'Canada':        { history: 'Première qualification depuis 1986. Co-organisateur de la CdM 2026.', best: 'Alphonso Davies', capped: 'Julian de Guzman (84 sél.)', scorer: 'Cyle Larin (29 buts)' },
  'Australia':     { history: 'Demi-finaliste surprise en 2023 (Mondial féminin). 4e en 2006 chez les hommes.', best: 'Mathew Ryan', capped: 'Mark Schwarzer (109 sél.)', scorer: 'Tim Cahill (50 buts)' },
  'Switzerland':   { history: 'Régulier en phase finale depuis 2006. Quart de finaliste en 2021.', best: 'Granit Xhaka', capped: 'Heinz Hermann (117 sél.)', scorer: 'Alexander Frei (42 buts)' },
  'Uruguay':       { history: 'Double champion du monde (1930, 1950). Berceau du football sud-américain.', best: 'Federico Valverde', capped: 'Diego Godín (160 sél.)', scorer: 'Luis Suárez (68 buts)' },
  'Ecuador':       { history: 'Quart de finaliste en 2006. Nation montante du football sud-américain.', best: 'Moisés Caicedo', capped: 'Iván Hurtado (168 sél.)', scorer: 'Agustín Delgado (31 buts)' },
  'Colombia':      { history: 'Quart de finaliste en 2014. Patrie de James Rodríguez, Ballon d\'Or du tournoi.', best: 'James Rodríguez', capped: 'Carlos Valderrama (111 sél.)', scorer: 'Radamel Falcao (36 buts)' },
  'Iran':          { history: 'Nation dominante d\'Asie de l\'Ouest. 6 participations en Coupe du Monde.', best: 'Mehdi Taremi', capped: 'Javad Nekounam (151 sél.)', scorer: 'Ali Daei (109 buts)' },
  'Saudi Arabia':  { history: 'Vainqueur surprise face à l\'Argentine en 2022. En plein essor footballistique.', best: 'Salem Al-Dawsari', capped: 'Mohamed Al-Deayea (181 sél.)', scorer: 'Majed Abdullah (72 buts)' },
  'Qatar':         { history: 'Pays hôte de la CdM 2022. Première nation éliminée dès la phase de groupes.', best: 'Akram Afif', capped: 'Hasan Al-Haydos (174 sél.)', scorer: 'Mokhtar Mokhtar (26 buts)' },
  'Denmark':       { history: 'Champion d\'Europe 1992 en tant que remplaçant surprise. Solide nation nordique.', best: 'Christian Eriksen', capped: 'Peter Schmeichel (129 sél.)', scorer: 'Poul Nielsen (52 buts)' },
  'Poland':        { history: '3e en 1974 et 1982. Nation de Lewandowski, meilleur buteur européen.', best: 'Robert Lewandowski', capped: 'Michał Żewłakow (102 sél.)', scorer: 'Robert Lewandowski (82 buts)' },
  'Serbia':        { history: 'Héritière de la Yougoslavie, demi-finaliste en 1962. Talent offensif reconnu.', best: 'Dušan Vlahović', capped: 'Dejan Stanković (103 sél.)', scorer: 'Stjepan Bobek (38 buts)' },
  'Tunisia':       { history: 'Nation africaine la plus régulière en Coupe du Monde avec 6 participations.', best: 'Youssef Msakni', capped: 'Sadok Sassi (111 sél.)', scorer: 'Issam Jebali (21 buts)' },
  'Ghana':         { history: 'Quart de finaliste en 2010. Meilleure nation d\'Afrique de l\'Ouest.', best: 'Mohammed Kudus', capped: 'Asamoah Gyan (109 sél.)', scorer: 'Asamoah Gyan (51 buts)' },
  'Cameroon':      { history: 'Quart de finaliste en 1990. Lion indomptable, 5 CAN remportées.', best: 'André Onana', capped: 'Rigobert Song (137 sél.)', scorer: 'Samuel Eto\'o (56 buts)' },
  'Nigeria':       { history: 'Champion d\'Afrique 2013. Les Super Eagles, nation la plus peuplée d\'Afrique.', best: 'Victor Osimhen', capped: 'Ahmed Musa (109 sél.)', scorer: 'Rashidi Yekini (37 buts)' },
  'South Africa':  { history: 'Pays hôte en 2010. Premier pays africain à accueillir la Coupe du Monde.', best: 'Percy Tau', capped: 'Aaron Mokoena (107 sél.)', scorer: 'Benni McCarthy (31 buts)' },
  'Czechia':       { history: 'Finaliste en 1962 et vice-champion d\'Europe 1996 sous le nom de Tchécoslovaquie.', best: 'Tomáš Souček', capped: 'Karel Poborský (118 sél.)', scorer: 'Jan Koller (55 buts)' },
  'Scotland':      { history: 'Nation fondatrice du football. Première équipe internationale de l\'histoire (1872).', best: 'Andy Robertson', capped: 'Kenny Dalglish (102 sél.)', scorer: 'Denis Law (30 buts)' },
  'Norway':        { history: 'Nation d\'Haaland. Quart de finaliste en 1938. Grand retour en 2026.', best: 'Erling Haaland', capped: 'John Arne Riise (110 sél.)', scorer: 'Jørgen Juve (33 buts)' },
  'Sweden':        { history: '3e en 1994 et finaliste en 1958. Nation de Zlatan Ibrahimović.', best: 'Alexander Isak', capped: 'Anders Svensson (148 sél.)', scorer: 'Zlatan Ibrahimović (62 buts)' },
  'Turkey':        { history: '3e place en 2002. Nation en plein renouveau avec une génération talentueuse.', best: 'Arda Güler', capped: 'Rüştü Reçber (120 sél.)', scorer: 'Hakan Şükür (51 buts)' },
  'Algeria':       { history: 'Champion d\'Afrique 2019. Nation des Fennecs, régulière en Coupe du Monde.', best: 'Riyad Mahrez', capped: 'Lakhdar Belloumi (102 sél.)', scorer: 'Abdelhafid Tasfaout (36 buts)' },
  'Egypt':         { history: 'Record de 7 titres africains. Patrie de Mohamed Salah, l\'un des meilleurs au monde.', best: 'Mohamed Salah', capped: 'Ahmed Hassan (184 sél.)', scorer: 'Hossam Hassan (69 buts)' },
  'New Zealand':   { history: 'Co-organisateur du Mondial féminin 2023. Première participation masculine depuis 2010.', best: 'Chris Wood', capped: 'Ivan Vicelich (88 sél.)', scorer: 'Vaughan Coveny (28 buts)' },
  'Paraguay':      { history: 'Quart de finaliste en 2010. Nation coriace d\'Amérique du Sud.', best: 'Miguel Almirón', capped: 'Esmael Fatecha (100 sél.)', scorer: 'Roque Santa Cruz (32 buts)' },
  'Panama':        { history: 'Deuxième participation en Coupe du Monde. Nation en progression constante.', best: 'Rodolfo Pitti', capped: 'Román Torres (141 sél.)', scorer: 'Blas Pérez (43 buts)' },
  'Jordan':        { history: 'Finaliste de la Coupe d\'Asie 2023. Première Coupe du Monde historique.', best: 'Musa Al-Taamari', capped: 'Baha\' Faisal (97 sél.)', scorer: 'Ahmad Hayel (20 buts)' },
  'Iraq':          { history: 'Champion d\'Asie 1964. Nation en reconstruction après des années difficiles.', best: 'Aymen Hussein', capped: 'Younis Mahmoud (148 sél.)', scorer: 'Younis Mahmoud (59 buts)' },
  'Indonesia':     { history: 'Première qualification historique en Coupe du Monde. Nation de 270 millions d\'habitants.', best: 'Marselino Ferdinan', capped: 'Bambang Pamungkas (85 sél.)', scorer: 'Bambang Pamungkas (37 buts)' },
  'Uzbekistan':    { history: 'Première qualification historique. Nation émergente d\'Asie centrale.', best: 'Eldor Shomurodov', capped: 'Server Djeparov (108 sél.)', scorer: 'Server Djeparov (27 buts)' },
  'Haiti':         { history: 'Seule participation en 1974. Retour historique pour les Grenadiers.', best: 'Duckens Nazon', capped: 'Frantz Mathieu (78 sél.)', scorer: 'Emmanuel Sanon (47 buts)' },
  'Curaçao':       { history: 'Première qualification historique. Petite île des Caraïbes au grand potentiel.', best: 'Leandro Bacuna', capped: 'Juriën Timber (45 sél.)', scorer: 'Leandro Bacuna (18 buts)' },
  'Cabo Verde':    { history: 'Première qualification historique. Les Requins Bleus, fierté du Cap-Vert.', best: 'Ryan Mendes', capped: 'Ryan Mendes (67 sél.)', scorer: 'Ryan Mendes (22 buts)' },
  'Bosnia-Herzegovina': { history: 'Première participation en 2014. Nation talentueuse des Balkans.', best: 'Edin Džeko', capped: 'Edin Džeko (129 sél.)', scorer: 'Edin Džeko (63 buts)' },
  'Scotland':      { history: 'Nation fondatrice du football moderne. Première équipe internationale (1872).', best: 'Andy Robertson', capped: 'Kenny Dalglish (102 sél.)', scorer: 'Denis Law (30 buts)' },
  'United States': { history: 'Co-organisateur 2026. Huitième de finaliste en 2022.', best: 'Christian Pulisic', capped: 'Cobi Jones (164 sél.)', scorer: 'Landon Donovan (57 buts)' },
  'Congo DR':      { history: 'Anciennement Zaïre, seule participation africaine en 1974 sous ce nom.', best: 'Cédric Bakambu', capped: 'Tresor Mputu (109 sél.)', scorer: 'Shabani Nonda (43 buts)' },
};

// GET /api/teams/:name/summary
router.get('/:name/summary', requireAuth, async (req, res) => {
  const teamName = decodeURIComponent(req.params.name);

  // Cherche dans les données statiques (insensible à la casse)
  const key = Object.keys(TEAM_DATA).find(k =>
    k.toLowerCase() === teamName.toLowerCase()
  );

  if (!key) {
    return res.json({ found: false, teamName });
  }

  const d = TEAM_DATA[key];
  res.json({
    found:    true,
    teamName: key,
    history:  d.history,
    best:     d.best,
    capped:   d.capped,
    scorer:   d.scorer,
  });
});

module.exports = router;