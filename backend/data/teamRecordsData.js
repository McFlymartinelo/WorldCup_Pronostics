'use strict';

/**
 * Records historiques A‑international (capés / buteurs all‑time).
 * Non disponibles via les APIs actuelles — complété pour les 48 nations CdM 2026.
 * « best » sert de repli ; la star actuelle est prioritairement dérivée de l'API.
 */
const TEAM_RECORDS = {
  France: {
    best: 'Kylian Mbappé',
    capped: 'Hugo Lloris (145 sél.)',
    scorer: 'Olivier Giroud (57 buts)',
  },
  Brazil: {
    best: 'Vinícius Jr',
    capped: 'Cafu (142 sél.)',
    scorer: 'Neymar (79 buts)',
  },
  Argentina: {
    best: 'Lionel Messi',
    capped: 'Lionel Messi (198 sél.)',
    scorer: 'Lionel Messi (116 buts)',
  },
  Germany: {
    best: 'Florian Wirtz',
    capped: 'Lothar Matthäus (150 sél.)',
    scorer: 'Miroslav Klose (71 buts)',
  },
  Spain: {
    best: 'Lamine Yamal',
    capped: 'Sergio Ramos (180 sél.)',
    scorer: 'David Villa (59 buts)',
  },
  England: {
    best: 'Jude Bellingham',
    capped: 'Peter Shilton (125 sél.)',
    scorer: 'Harry Kane (78 buts)',
  },
  'United States': {
    best: 'Christian Pulisic',
    capped: 'Cobi Jones (164 sél.)',
    scorer: 'Clint Dempsey (57 buts)',
  },
  Mexico: {
    best: 'Raúl Jiménez',
    capped: 'Claudio Suárez (180 sél.)',
    scorer: 'Javier Hernández (52 buts)',
  },
  Canada: {
    best: 'Alphonso Davies',
    capped: 'Atiba Hutchinson (104 sél.)',
    scorer: 'Cyle Larin (30 buts)',
  },
  Morocco: {
    best: 'Achraf Hakimi',
    capped: 'Noureddine Naybet (115 sél.)',
    scorer: 'Ahmed Faras (36 buts)',
  },
  Japan: {
    best: 'Kaoru Mitoma',
    capped: 'Yasuhito Endo (152 sél.)',
    scorer: 'Kunishige Kamamoto (75 buts)',
  },
  Portugal: {
    best: 'Cristiano Ronaldo',
    capped: 'Cristiano Ronaldo (226 sél.)',
    scorer: 'Cristiano Ronaldo (143 buts)',
  },
  Netherlands: {
    best: 'Memphis Depay',
    capped: 'Wesley Sneijder (134 sél.)',
    scorer: 'Memphis Depay (55 buts)',
  },
  Croatia: {
    best: 'Luka Modrić',
    capped: 'Luka Modrić (196 sél.)',
    scorer: 'Davor Šuker (45 buts)',
  },
  Belgium: {
    best: 'Kevin De Bruyne',
    capped: 'Jan Vertonghen (157 sél.)',
    scorer: 'Romelu Lukaku (89 buts)',
  },
  Switzerland: {
    best: 'Granit Xhaka',
    capped: 'Granit Xhaka (143 sél.)',
    scorer: 'Alexander Frei (42 buts)',
  },
  'South Korea': {
    best: 'Son Heung-min',
    capped: 'Cha Bum-kun (136 sél.)',
    scorer: 'Cha Bum-kun (58 buts)',
  },
  Senegal: {
    best: 'Sadio Mané',
    capped: 'Idrissa Gueye (130 sél.)',
    scorer: 'Sadio Mané (55 buts)',
  },
  Colombia: {
    best: 'James Rodríguez',
    capped: 'David Ospina (128 sél.)',
    scorer: 'Radamel Falcao (36 buts)',
  },
  Uruguay: {
    best: 'Federico Valverde',
    capped: 'Diego Godín (161 sél.)',
    scorer: 'Luis Suárez (69 buts)',
  },
  Scotland: {
    best: 'Andy Robertson',
    capped: 'Kenny Dalglish (102 sél.)',
    scorer: 'Kenny Dalglish (30 buts)',
  },
  Norway: {
    best: 'Erling Haaland',
    capped: 'John Arne Riise (110 sél.)',
    scorer: 'Erling Haaland (55 buts)',
  },
  'Bosnia-Herzegovina': {
    best: 'Edin Džeko',
    capped: 'Edin Džeko (139 sél.)',
    scorer: 'Edin Džeko (67 buts)',
  },
  Czechia: {
    best: 'Patrik Schick',
    capped: 'Petr Čech (124 sél.)',
    scorer: 'Jan Koller (55 buts)',
  },
  Haiti: {
    best: 'Duckens Nazon',
    capped: 'Frantz Mathieu (78 sél.)',
    scorer: 'Emmanuel Sanon (47 buts)',
  },
  'Cape Verde Islands': {
    best: 'Ryan Mendes',
    capped: 'Nuno Rocha (80+ sél.)',
    scorer: 'Héldon Ramos (15 buts)',
  },
  Curaçao: {
    best: 'Leandro Bacuna',
    capped: 'Cuco Martina (63 sél.)',
    scorer: 'Leandro Bacuna (14 buts)',
  },
  Qatar: {
    best: 'Akram Afif',
    capped: 'Hassan Al-Haydos (186 sél.)',
    scorer: 'Almoez Ali (60 buts)',
  },
  'South Africa': {
    best: 'Percy Tau',
    capped: 'Aaron Mokoena (107 sél.)',
    scorer: 'Benni McCarthy (31 buts)',
  },
  Tunisia: {
    best: 'Youssef Msakni',
    capped: 'Radhi Jaïdi (105 sél.)',
    scorer: 'Issam Jebali (36 buts)',
  },
  'New Zealand': {
    best: 'Chris Wood',
    capped: 'Ivan Vicelich (88 sél.)',
    scorer: 'Chris Wood (45 buts)',
  },
  Jordan: {
    best: 'Musa Al-Taamari',
    capped: "Amer Shafi (176 sél.)",
    scorer: 'Hamza Al-Dardour (35 buts)',
  },
  Uzbekistan: {
    best: 'Eldor Shomurodov',
    capped: 'Server Djeparov (128 sél.)',
    scorer: 'Eldor Shomurodov (41 buts)',
  },
  Paraguay: {
    best: 'Miguel Almirón',
    capped: 'Paulo da Silva (148 sél.)',
    scorer: 'Roque Santa Cruz (32 buts)',
  },
  Egypt: {
    best: 'Mohamed Salah',
    capped: 'Ahmed Hassan (183 sél.)',
    scorer: 'Hossam Hassan (69 buts)',
  },
  Algeria: {
    best: 'Riyad Mahrez',
    capped: 'Aïssa Mandi (103 sél.)',
    scorer: 'Islam Slimani (46 buts)',
  },
  Australia: {
    best: 'Mathew Ryan',
    capped: 'Mark Schwarzer (109 sél.)',
    scorer: 'Tim Cahill (50 buts)',
  },
  'Saudi Arabia': {
    best: 'Salem Al-Dawsari',
    capped: 'Mohamed Al-Deayea (178 sél.)',
    scorer: 'Majed Abdullah (72 buts)',
  },
  'Ivory Coast': {
    best: 'Sébastien Haller',
    capped: 'Didier Zokora (123 sél.)',
    scorer: 'Didier Drogba (65 buts)',
  },
  Ghana: {
    best: 'Mohammed Kudus',
    capped: 'Asamoah Gyan (109 sél.)',
    scorer: 'Asamoah Gyan (51 buts)',
  },
  Ecuador: {
    best: 'Enner Valencia',
    capped: 'Iván Hurtado (168 sél.)',
    scorer: 'Enner Valencia (49 buts)',
  },
  Iran: {
    best: 'Mehdi Taremi',
    capped: 'Javad Nekounam (149 sél.)',
    scorer: 'Ali Daei (109 buts)',
  },
  Panama: {
    best: 'Aníbal Godoy',
    capped: 'Aníbal Godoy (152 sél.)',
    scorer: 'Luis Tejada (43 buts)',
  },
  Austria: {
    best: 'Marcel Sabitzer',
    capped: 'Marko Arnautović (132 sél.)',
    scorer: 'Anton Polster (44 buts)',
  },
  Sweden: {
    best: 'Victor Gyökeres',
    capped: 'Anders Svensson (148 sél.)',
    scorer: 'Zlatan Ibrahimović (62 buts)',
  },
  Turkey: {
    best: 'Hakan Çalhanoğlu',
    capped: 'Rüştü Reçber (120 sél.)',
    scorer: 'Hakan Şükür (51 buts)',
  },
  Iraq: {
    best: 'Mohanad Ali',
    capped: 'Younis Mahmoud (148 sél.)',
    scorer: 'Hussein Saeed (78 buts)',
  },
  'Congo DR': {
    best: 'Cédric Bakambu',
    capped: 'Issama Mpeko (110 sél.)', //Chancel Mbemba 89, 
    scorer: 'Dieumerci Mbokani (22 buts)',
  },
};

function getTeamRecords (teamName) {
  if (!teamName) return null;
  if (TEAM_RECORDS[teamName]) return TEAM_RECORDS[teamName];
  const found = Object.keys(TEAM_RECORDS).find(
    k => k.toLowerCase() === teamName.toLowerCase()
  );
  return found ? TEAM_RECORDS[found] : null;
}

module.exports = { TEAM_RECORDS, getTeamRecords };
