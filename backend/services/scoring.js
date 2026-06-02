'use strict';

function matchResult (home, away) {
  if (home > away) return '1';
  if (home < away) return '2';
  return 'N';
}

function goalDiff (home, away) {
  return home - away;
}

function scorePrediction (predHome, predAway, realHome, realAway) {
  if (predHome === realHome && predAway === realAway) return 3;
  if (matchResult(predHome, predAway) !== matchResult(realHome, realAway)) return 0;
  if (goalDiff(predHome, predAway) === goalDiff(realHome, realAway)) return 2;
  return 1;
}

module.exports = { matchResult, goalDiff, scorePrediction };
