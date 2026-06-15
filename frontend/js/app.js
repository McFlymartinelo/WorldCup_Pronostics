'use strict';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initAuthUI();
  initNotifDeepLink();

  const token = localStorage.getItem('token');
  if (token) {
    try {
      state.user = await API.me();
      await showApp();
    } catch {
      localStorage.removeItem('token');
      showLogin();
    }
  } else {
    showLogin();
  }
});
