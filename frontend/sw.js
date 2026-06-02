self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const isChat = data.data?.type === 'chat';

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pronostics CdM', {
      body: data.body || '',
      icon: data.icon || '/icon.png',
      badge: data.badge || '/badge.png',
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

function openChat (poolId) {
  const url = poolId ? `/?view=chat&pool=${poolId}` : '/?view=chat';
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    for (const client of clientList) {
      client.postMessage({ type: 'navigate-chat', poolId });
      return client.focus();
    }
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

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow('/');
      }
    }),
  );
});
