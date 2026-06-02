'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { scorePrediction, matchResult } = require('../backend/services/scoring');

describe('scorePrediction', () => {
  it('accorde 3 points pour un score exact', () => {
    assert.equal(scorePrediction(2, 1, 2, 1), 3);
    assert.equal(scorePrediction(0, 0, 0, 0), 3);
  });

  it('accorde 1 point pour le bon résultat (1N2)', () => {
    assert.equal(scorePrediction(1, 0, 2, 1), 1);
    assert.equal(scorePrediction(0, 0, 1, 1), 1);
    assert.equal(scorePrediction(0, 2, 0, 1), 1);
  });

  it('accorde 0 point si mauvais résultat', () => {
    assert.equal(scorePrediction(0, 2, 2, 0), 0);
    assert.equal(scorePrediction(1, 1, 2, 1), 0);
  });
});

describe('matchResult', () => {
  it('détermine victoire domicile, extérieur ou nul', () => {
    assert.equal(matchResult(2, 1), '1');
    assert.equal(matchResult(0, 1), '2');
    assert.equal(matchResult(1, 1), 'N');
  });
});
