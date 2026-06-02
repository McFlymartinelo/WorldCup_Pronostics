'use strict';

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
