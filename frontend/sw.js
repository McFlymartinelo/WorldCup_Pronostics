const CACHE = 'wc-pwa-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request)),
  );
});

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

  if (data.matchId && (data.type === 'score' || data.type === 'kickoff' || data.type === 'reminder')) {
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
