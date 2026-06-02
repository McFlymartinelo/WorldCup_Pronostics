'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildStandingsExport } = require('../backend/services/exportService');

describe('buildStandingsExport', () => {
  it('formate le classement en texte partageable', () => {
    const text = buildStandingsExport([
      {
        pseudo: 'Alice',
        total_points: 42,
        exact_scores: 5,
        good_results: 8,
        bonus_winner: true,
        bonus_special: 2,
      },
      {
        pseudo: 'Bob',
        total_points: 38,
        exact_scores: 3,
        good_results: 10,
        bonus_scorer: true,
        bonus_special: 0,
      },
    ], 'Les potes');

    assert.match(text, /Classement — Les potes/);
    assert.match(text, /🥇 Alice — 42 pts/);
    assert.match(text, /🥈 Bob — 38 pts/);
    assert.match(text, /🏆/);
    assert.match(text, /⚽/);
    assert.match(text, /🎲\+2/);
    assert.match(text, /Partagé depuis Pronostics CdM 2026/);
  });
});
