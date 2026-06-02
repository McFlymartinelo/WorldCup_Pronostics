'use strict';

function setActiveNav (view) {
  const navView = view === 'detail' ? (state.detailReturnView || 'matches') : view;
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === navView);
  });
}

function navigateTo (view, params = {}) {
  if (view !== 'chat') stopChatPoll();
  if (view !== 'matches' && view !== 'detail') stopLivePoll();
  if (view !== 'standings') destroyStatsCharts();

  if (view === 'detail') {
    state.detailReturnView = params.returnView || state.detailReturnView || 'matches';
  }

  ['matches', 'detail', 'standings', 'admin', 'tournament', 'profile', 'chat'].forEach(v => {
    document.getElementById(`view-${v}`)?.classList.add('hidden');
  });
  document.getElementById(`view-${view}`).classList.remove('hidden');
  state.currentView = view;
  setActiveNav(view);

  if (view === 'matches') renderMatches();
  if (view === 'detail') renderDetail(params.matchId);
  if (view === 'standings') renderStandings();
  if (view === 'tournament') renderTournament();
  if (view === 'admin') renderAdmin();
  if (view === 'profile') renderProfile();
  if (view === 'chat') renderChat(true);
}
