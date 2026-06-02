self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const isChat = data.data?.type === 'chat';

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pronostics CdM', {
      body: data.body || '',
      icon: data.icon || '/icon.svg',
      badge: data.badge || '/badge.svg',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: isChat
        ? [{ action: 'open', title: '💬 Ouvrir le chat' }]
        : [
            { action: 'open', title: '👀 Voir le match' },
            { action: 'dismiss', title: '✕ Ignorer' },
          ],
    }),
  );
});

function focusClient (clientList, message) {
  for (const client of clientList) {
    if (message) client.postMessage(message);
    return client.focus();
  }
  return null;
}

function openChat (poolId) {
  const url = poolId ? `/?view=chat&pool=${poolId}` : '/?view=chat';
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    const focused = focusClient(clientList, { type: 'navigate-chat', poolId });
    if (focused) return focused;
    return clients.openWindow(url);
  });
}

function openMatch (matchId) {
  const url = matchId ? `/?view=detail&match=${matchId}` : '/';
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    const focused = focusClient(clientList, { type: 'navigate-match', matchId });
    if (focused) return focused;
    return clients.openWindow(url);
  });
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const data = event.notification.data || {};

  if (data.type === 'chat') {
    event.waitUntil(openChat(data.poolId));
    return;
  }

  if (data.matchId && (data.type === 'score' || data.type === 'kickoff')) {
    event.waitUntil(openMatch(data.matchId));
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    }),
  );
});
