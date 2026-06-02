const API = (() => {
  const BASE = '/api';

  function getToken () { return localStorage.getItem('token'); }

  async function req (method, path, body) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  return {
    // Auth
    login:          (pseudo, password) => req('POST', '/auth/login',    { pseudo, password }),
    register:       (pseudo, password) => req('POST', '/auth/register', { pseudo, password }),
    me:             ()                 => req('GET',  '/auth/me'),

    // Matchs
    getMatches:     ()          => req('GET', '/matches'),
    getMatch:       (id)        => req('GET', `/matches/${id}`),

    // Pronostics
    savePrediction: (match_id, predicted_home, predicted_away) =>
      req('POST', '/predictions', { match_id, predicted_home, predicted_away }),

    // Classement
    getStandings:   ()          => req('GET', '/standings'),

    // Admin
    getUsers:       ()                  => req('GET',    '/admin/users'),
    createUser:     (d)                 => req('POST',   '/admin/users', d),
    deleteUser:     (id)                => req('DELETE', `/admin/users/${id}`),
    syncFixtures:   ()                  => req('POST',   '/admin/sync/fixtures'),
    syncScores:     ()                  => req('POST',   '/admin/sync/scores'),
    getSyncLog:     ()                  => req('GET',    '/admin/sync-log'),
    syncForms:      ()                  => req('POST', '/admin/sync/forms'),
    getTeamSummary: (name)              => req('GET', `/teams/${encodeURIComponent(name)}/summary`),
    getH2H:           (home, away)        => req('GET', `/teams/h2h/${encodeURIComponent(home)}/${encodeURIComponent(away)}`),
    getSquad:       (teamName)          => req('GET', `/squads/${encodeURIComponent(teamName)}`),
    syncSquads:     ()                  => req('POST', '/admin/sync/squads'),
    getTournament:  ()                  => req('GET', '/tournament'),
    // Notifications        
    getVapidKey:      ()                => req('GET',    '/notifications/vapid-key'),
    getNotifStatus:   ()                => req('GET',    '/notifications/status'),
    subscribeNotif:   (sub)             => req('POST',   '/notifications/subscribe', { subscription: sub }),
    unsubscribeNotif: ()                => req('DELETE', '/notifications/unsubscribe'),
    getProfile:           ()           => req('GET',   '/profile'),
    getProfilePickOptions: ()          => req('GET',   '/profile/pick-options'),
    updateProfile:        (data)       => req('PATCH', '/profile', data),
    getCompetitionResults: ()          => req('GET',   '/admin/competition-results'),
    setCompetitionResults: (data)     => req('PATCH', '/admin/competition-results', data),
  };
})();