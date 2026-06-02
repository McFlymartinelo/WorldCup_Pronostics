self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Pronostics CdM', {
      body:    data.body  || '',
      icon:    data.icon  || '/icon.png',
      badge:   data.badge || '/badge.png',
      vibrate: [200, 100, 200],
      data:    data.data  || {},
      actions: [
        { action: 'open',    title: '👀 Voir le match' },
        { action: 'dismiss', title: '✕ Ignorer' },
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          clients.openWindow('/');
        }
      })
    );
  }
});