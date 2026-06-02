'use strict';

function initAuthUI () {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const btnAuth = document.getElementById('btn-auth');
  const authError = document.getElementById('auth-error');
  const registerPoolSection = document.getElementById('register-pool-section');
  const regTabSelect = document.getElementById('reg-pool-tab-select');
  const regTabCode = document.getElementById('reg-pool-tab-code');
  const poolSelect = document.getElementById('input-pool-select');
  const poolCodeReg = document.getElementById('input-pool-code-reg');
  let mode = 'login';
  let regPoolMode = 'select';
  let publicPools = [];

  async function loadPublicPools () {
    try {
      publicPools = await API.getPublicPools();
      if (!poolSelect) return;
      if (!publicPools.length) {
        poolSelect.innerHTML = '<option value="">Aucun groupe public — utilisez un code</option>';
        return;
      }
      poolSelect.innerHTML = publicPools.map(p =>
        `<option value="${p.id}">${escHtml(p.name)} (${p.member_count} membre${p.member_count > 1 ? 's' : ''})</option>`,
      ).join('');
    } catch {
      if (poolSelect) {
        poolSelect.innerHTML = '<option value="">Impossible de charger les groupes</option>';
      }
    }
  }

  function setRegPoolMode (next) {
    regPoolMode = next;
    regTabSelect?.classList.toggle('active', next === 'select');
    regTabCode?.classList.toggle('active', next === 'code');
    poolSelect?.classList.toggle('hidden', next !== 'select');
    poolCodeReg?.classList.toggle('hidden', next !== 'code');
  }

  tabLogin.addEventListener('click', () => {
    mode = 'login';
    tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    btnAuth.textContent = 'Se connecter';
    registerPoolSection?.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    mode = 'register';
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    btnAuth.textContent = "S'inscrire";
    registerPoolSection?.classList.remove('hidden');
    setRegPoolMode('select');
    loadPublicPools();
  });

  regTabSelect?.addEventListener('click', () => setRegPoolMode('select'));
  regTabCode?.addEventListener('click', () => setRegPoolMode('code'));

  btnAuth.addEventListener('click', async () => {
    const pseudo = document.getElementById('input-pseudo').value.trim();
    const password = document.getElementById('input-password').value;
    authError.classList.add('hidden');
    btnAuth.disabled = true;
    try {
      let data;
      if (mode === 'login') {
        data = await API.login(pseudo, password);
      } else {
        const poolPayload = regPoolMode === 'code'
          ? { invite_code: poolCodeReg?.value.trim() }
          : { pool_id: parseInt(poolSelect?.value, 10) };
        if (regPoolMode === 'code' && !poolPayload.invite_code) {
          throw new Error('Saisissez un code d\'accès');
        }
        if (regPoolMode === 'select' && !poolPayload.pool_id) {
          throw new Error('Choisissez un groupe');
        }
        data = await API.register(pseudo, password, poolPayload);
        if (data.pool_id) API.setPoolId(data.pool_id);
      }
      localStorage.setItem('token', data.token);
      state.user = { pseudo: data.pseudo, role: data.role };
      await showApp();
    } catch (e) {
      authError.textContent = e.message;
      authError.classList.remove('hidden');
    } finally {
      btnAuth.disabled = false;
    }
  });
}

function showLogin () {
  document.getElementById('view-login').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

async function showApp () {
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('nav-tournament').classList.remove('hidden');
  document.getElementById('header-pseudo').textContent = state.user.pseudo;

  await loadPools();
  initPoolUI();

  if (state.user.role === 'admin') {
    document.getElementById('nav-admin').classList.remove('hidden');
  }

  document.getElementById('btn-logout').addEventListener('click', () => {
    stopChatPoll();
    localStorage.removeItem('token');
    state.user = null;
    showLogin();
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const logoutBtn = document.getElementById('btn-logout');
  let notifBtn = document.getElementById('btn-notif');
  if (logoutBtn && !notifBtn) {
    notifBtn = document.createElement('button');
    notifBtn.id = 'btn-notif';
    notifBtn.className = 'text-muted hover:text-white transition';
    notifBtn.title = 'Notifications';
    notifBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>`;
    logoutBtn.parentNode.insertBefore(notifBtn, logoutBtn);
  }
  if (notifBtn) {
    try {
      await initNotifications(notifBtn);
    } catch (e) {
      console.error('initNotifications error:', e);
    }
  }

  const profile = await API.getProfile().catch(() => null);
  if (profile) {
    state.user.avatar = profile.avatar || '⚽';
    state.user.color = profile.color || '#3b82f6';
  }

  const pseudoEl = document.getElementById('header-pseudo');
  if (pseudoEl) {
    pseudoEl.innerHTML = `
      <span style="font-size:14px">${state.user.avatar}</span>
      <span>${state.user.pseudo}</span>`;
  }

  navigateTo('matches');
  await applyPendingNotifNavigation();
}
