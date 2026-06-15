'use strict';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function readJoinCodeFromUrl () {
  try {
    const params = new URLSearchParams(location.search);
    const code = params.get('join');
    if (code) {
      state.pendingJoinCode = code.trim().toUpperCase();
      params.delete('join');
      const qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
    }
  } catch { /* ignore */ }
}

document.addEventListener('DOMContentLoaded', async () => {
  initAuthUI();
  initNotifDeepLink();
  readJoinCodeFromUrl();

  const token = localStorage.getItem('token');
  if (token) {
    try {
      state.user = await API.me();
      await showApp();
    } catch {
      localStorage.removeItem('token');
      showLogin();
      prefillJoinCode();
    }
  } else {
    showLogin();
    prefillJoinCode();
  }
});
