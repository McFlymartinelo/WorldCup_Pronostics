const API = (() => {
  const BASE = '/api';

  function getToken () { return localStorage.getItem('token'); }
  function getPoolId () { return localStorage.getItem('currentPoolId'); }
  function setPoolId (id) {
    if (id) localStorage.setItem('currentPoolId', String(id));
    else localStorage.removeItem('currentPoolId');
  }

  async function req (method, path, body, { poolScoped = false } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    };

    if (poolScoped) {
      const poolId = getPoolId();
      if (!poolId) throw new Error('Aucun groupe sélectionné');
      headers['X-Pool-Id'] = poolId;
    }

    const opts = {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  return {
    getPoolId,
    setPoolId,

    // Auth
    login:          (pseudo, password) => req('POST', '/auth/login',    { pseudo, password }),
    register:       (pseudo, password, pool) => req('POST', '/auth/register', { pseudo, password, ...pool }),
    me:             ()                 => req('GET',  '/auth/me'),

    // Groupes
    getPublicPools: ()                 => req('GET',  '/pools/public'),
    getPools:       ()                 => req('GET',  '/pools'),
    createPool:     (name)             => req('POST', '/pools', { name }),
    joinPool:       (invite_code)      => req('POST', '/pools/join', { invite_code }),
    getPool:        (id)               => req('GET',  `/pools/${id}`),

    // Chat (par groupe)
    getChatMessages: (after = 0) => {
      const poolId = getPoolId();
      if (!poolId) throw new Error('Aucun groupe sélectionné');
      const q = after ? `?after=${after}` : '';
      return req('GET', `/pools/${poolId}/chat${q}`);
    },
    sendChatMessage: (content) => {
      const poolId = getPoolId();
      if (!poolId) throw new Error('Aucun groupe sélectionné');
      return req('POST', `/pools/${poolId}/chat`, { content });
    },
    toggleChatReaction: (messageId, emoji) => {
      const poolId = getPoolId();
      if (!poolId) throw new Error('Aucun groupe sélectionné');
      return req('POST', `/pools/${poolId}/chat/${messageId}/reactions`, { emoji });
    },

    // Matchs
    getMatches:     ()          => req('GET', '/matches', null, { poolScoped: true }),
    getMatch:       (id)        => req('GET', `/matches/${id}`, null, { poolScoped: true }),

    // Pronostics
    savePrediction: (match_id, predicted_home, predicted_away) =>
      req('POST', '/predictions', { match_id, predicted_home, predicted_away }, { poolScoped: true }),

    // Classement
    getStandings:   ()          => req('GET', '/standings', null, { poolScoped: true }),
    getAdvancedStats: ()        => req('GET', '/stats/advanced', null, { poolScoped: true }),
    getBadges:        ()         => req('GET', '/stats/badges', null, { poolScoped: true }),
    comparePlayer:    (id)       => req('GET', `/stats/compare/${id}`, null, { poolScoped: true }),
    exportStandings:  ()         => req('GET', '/stats/export', null, { poolScoped: true }),
    getGroupResults:  ()         => req('GET', '/admin/group-results'),
    setGroupResult:   (data)     => req('PATCH', '/admin/group-results', data),
    resetUserPassword:(id, password) => req('PATCH', `/admin/users/${id}/password`, { password }),

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
    getProfile:           ()           => req('GET',   '/profile', null, { poolScoped: true }),
    getProfilePickOptions: ()          => req('GET',   '/profile/pick-options', null, { poolScoped: true }),
    updateProfile:        (data)       => req('PATCH', '/profile', data, { poolScoped: true }),
    getCompetitionResults: ()          => req('GET',   '/admin/competition-results'),
    setCompetitionResults: (data)     => req('PATCH', '/admin/competition-results', data),
  };
})();
