'use strict';

function navigateTo (view, params = {}) {
  if (view !== 'chat') stopChatPoll();
  if (view !== 'matches' && view !== 'detail') stopLivePoll();
  if (view !== 'standings') destroyStatsCharts();

  ['matches', 'detail', 'standings', 'admin', 'tournament', 'profile', 'chat'].forEach(v => {
    document.getElementById(`view-${v}`)?.classList.add('hidden');
  });
  document.getElementById(`view-${view}`).classList.remove('hidden');
  state.currentView = view;

  if (view === 'matches') renderMatches();
  if (view === 'detail') renderDetail(params.matchId);
  if (view === 'standings') renderStandings();
  if (view === 'tournament') renderTournament();
  if (view === 'admin') renderAdmin();
  if (view === 'profile') renderProfile();
  if (view === 'chat') renderChat(true);
}
