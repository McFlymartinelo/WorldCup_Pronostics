'use strict';

function matchResult (home, away) {
  if (home > away) return '1';
  if (home < away) return '2';
  return 'N';
}

function scorePrediction (predHome, predAway, realHome, realAway) {
  if (predHome === realHome && predAway === realAway) return 3;
  if (matchResult(predHome, predAway) === matchResult(realHome, realAway)) return 1;
  return 0;
}

module.exports = { matchResult, scorePrediction };
