'use strict';

function getNotifDeepLink () {
  const params = new URLSearchParams(location.search);
  const view = params.get('view');
  history.replaceState({}, '', location.pathname);

  const poolId = parseInt(params.get('pool'), 10);
  if (view === 'chat' && Number.isInteger(poolId)) {
    return { view: 'chat', poolId };
  }

  const matchId = parseInt(params.get('match'), 10);
  if (view === 'detail' && Number.isInteger(matchId)) {
    return { view: 'detail', matchId };
  }

  return null;
}

function initNotifDeepLink () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (e) => {
      if (!state.user) return;
      if (e.data?.type === 'navigate-chat') {
        await openChatFromNotif(e.data.poolId);
      }
      if (e.data?.type === 'navigate-match') {
        await openMatchFromNotif(e.data.matchId);
      }
    });
  }
  window.pendingNotifLink = getNotifDeepLink();
}

async function openMatchFromNotif (matchId) {
  if (!matchId) {
    navigateTo('matches');
    return;
  }
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.nav-btn[data-view="matches"]')?.classList.add('active');
  navigateTo('detail', { matchId });
}

async function applyPendingNotifNavigation () {
  const link = window.pendingNotifLink;
  window.pendingNotifLink = null;
  if (link?.view === 'chat') await openChatFromNotif(link.poolId);
  if (link?.view === 'detail') await openMatchFromNotif(link.matchId);
}

async function openChatFromNotif (poolId) {
  if (!poolId) {
    navigateTo('chat');
    return;
  }
  if (!state.pools.length) await loadPools();
  const pool = state.pools.find(p => p.id === poolId);
  if (pool) await selectPool(poolId);
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.nav-btn[data-view="chat"]')?.classList.add('active');
  navigateTo('chat');
}

function stopLivePoll () {
  if (state.livePollTimer) {
    clearInterval(state.livePollTimer);
    state.livePollTimer = null;
  }
  state.liveDetailMatchId = null;
}

function startLivePoll (callback, intervalMs = 30000) {
  stopLivePoll();
  state.livePollTimer = setInterval(callback, intervalMs);
}

function stopChatPoll () {
  if (state.chatPollTimer) {
    clearInterval(state.chatPollTimer);
    state.chatPollTimer = null;
  }
}

function startChatPoll () {
  stopChatPoll();
  state.chatPollTimer = setInterval(() => pollChatMessages(), 4000);
}

async function initNotifications (btn) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    btn.style.display = 'none';
    return;
  }

  const reg = await navigator.serviceWorker.register('/sw.js');

  const { subscribed } = await API.getNotifStatus().catch(() => ({ subscribed: false }));
  updateNotifBtn(btn, subscribed);

  btn.addEventListener('click', async () => {
    const isSubscribed = btn.dataset.subscribed === 'true';

    if (isSubscribed) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await API.unsubscribeNotif();
      updateNotifBtn(btn, false);
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast('Vous avez refusé les notifications.', 'warning');
        return;
      }

      const { key: vapidKey } = await API.getVapidKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await API.subscribeNotif(sub);
      updateNotifBtn(btn, true);
    }
  });
}
