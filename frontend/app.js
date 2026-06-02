/* ═══════════════════════════════════════════════════════════════
   État global
═══════════════════════════════════════════════════════════════ */
let state = {
  user: null,
  currentView: 'matches',
  matches: [],
  standings: [],
  pools: [],
  currentPool: null,
  chatMessages: [],
  chatEmojis: [],
  chatLastId: 0,
  chatPollTimer: null,
  statsCharts: [],
  standingsTab: 'table',
};

/* ═══════════════════════════════════════════════════════════════
   Boot
═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   Auth
═══════════════════════════════════════════════════════════════ */
function initAuthUI() {
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

function showLogin() {
  document.getElementById('view-login').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

async function showApp() {
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('nav-tournament').classList.remove('hidden');
  document.getElementById('header-pseudo').textContent = state.user.pseudo;

  await loadPools();
  initPoolUI();

  // Affiche le bouton admin si besoin
  if (state.user.role === 'admin')
    document.getElementById('nav-admin').classList.remove('hidden');

  // Déconnexion
  document.getElementById('btn-logout').addEventListener('click', () => {
    stopChatPoll();
    localStorage.removeItem('token');
    state.user = null;
    showLogin();
  });

  // Navigation bas
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Bouton notifications — ajout direct avant le bouton logout
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

  // Charge le profil utilisateur
  const profile = await API.getProfile().catch(() => null);
  if (profile) {
    state.user.avatar = profile.avatar || '⚽';
    state.user.color  = profile.color  || '#3b82f6';
  }

  // Met à jour le header avec l'avatar
  const pseudoEl = document.getElementById('header-pseudo');
  if (pseudoEl) {
    pseudoEl.innerHTML = `
      <span style="font-size:14px">${state.user.avatar}</span>
      <span>${state.user.pseudo}</span>`;
  }

  navigateTo('matches');
  await applyPendingNotifNavigation();
}

function getNotifDeepLink () {
  const params = new URLSearchParams(location.search);
  const view = params.get('view');
  const poolId = parseInt(params.get('pool'), 10);
  if (view === 'chat' && Number.isInteger(poolId)) {
    history.replaceState({}, '', location.pathname);
    return { view: 'chat', poolId };
  }
  return null;
}

function initNotifDeepLink () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (e) => {
      if (e.data?.type === 'navigate-chat' && state.user) {
        await openChatFromNotif(e.data.poolId);
      }
    });
  }
  window.pendingNotifLink = getNotifDeepLink();
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

async function applyPendingNotifNavigation () {
  const link = window.pendingNotifLink;
  window.pendingNotifLink = null;
  if (link?.view === 'chat') await openChatFromNotif(link.poolId);
}

async function loadPools () {
  state.pools = await API.getPools();
  const savedId = API.getPoolId();
  const saved = state.pools.find(p => String(p.id) === savedId);
  state.currentPool = saved || state.pools[0] || null;
  if (state.currentPool) API.setPoolId(state.currentPool.id);
  updatePoolSelectorLabel();
}

function updatePoolSelectorLabel () {
  const btn = document.getElementById('btn-pool-selector');
  if (!btn) return;
  btn.textContent = state.currentPool
    ? `👥 ${state.currentPool.name}`
    : 'Aucun groupe';
}

function initPoolUI () {
  const modal = document.getElementById('pool-modal');
  const btnOpen = document.getElementById('btn-pool-selector');
  const btnClose = document.getElementById('btn-pool-close');
  const btnCreate = document.getElementById('btn-pool-create');
  const btnJoin = document.getElementById('btn-pool-join');
  const msg = document.getElementById('pool-msg');

  if (!modal || !btnOpen) return;

  btnOpen.addEventListener('click', () => {
    renderPoolModal();
    modal.classList.remove('hidden');
  });

  btnClose?.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  btnCreate?.addEventListener('click', async () => {
    const name = document.getElementById('input-pool-name')?.value.trim();
    if (!name) return;
    btnCreate.disabled = true;
    try {
      const pool = await API.createPool(name);
      await loadPools();
      await selectPool(pool.id);
      document.getElementById('input-pool-name').value = '';
      renderPoolModal();
      showPoolMsg('Groupe créé !', 'green');
    } catch (e) {
      showPoolMsg(e.message, 'red');
    } finally {
      btnCreate.disabled = false;
    }
  });

  btnJoin?.addEventListener('click', async () => {
    const code = document.getElementById('input-pool-code')?.value.trim();
    if (!code) return;
    btnJoin.disabled = true;
    try {
      const pool = await API.joinPool(code);
      await loadPools();
      await selectPool(pool.id);
      document.getElementById('input-pool-code').value = '';
      renderPoolModal();
      showPoolMsg(`Bienvenue dans « ${pool.name} » !`, 'green');
    } catch (e) {
      showPoolMsg(e.message, 'red');
    } finally {
      btnJoin.disabled = false;
    }
  });

  function showPoolMsg (text, color) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = `text-xs text-center ${color === 'green' ? 'text-green-400' : 'text-red-400'}`;
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  }
}

function renderPoolModal () {
  const list = document.getElementById('pool-list');
  if (!list) return;

  if (!state.pools.length) {
    list.innerHTML = '<p class="text-xs text-muted text-center py-4">Aucun groupe — créez-en un ou rejoignez avec un code.</p>';
    return;
  }

  list.innerHTML = state.pools.map(p => `
    <button type="button"
            class="pool-pick w-full text-left bg-bg border rounded-xl px-3 py-2.5 transition
                   ${p.id === state.currentPool?.id ? 'border-blue-600 ring-1 ring-blue-600/40' : 'border-border hover:border-slate-500'}"
            data-pool-id="${p.id}">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm text-white font-medium truncate">${escHtml(p.name)}</span>
        ${p.id === state.currentPool?.id ? '<span class="text-[10px] text-blue-300 shrink-0">Actif</span>' : ''}
      </div>
      <p class="text-[10px] text-muted mt-0.5">
        ${p.member_count} membre${p.member_count > 1 ? 's' : ''}
        ${p.role === 'owner' ? ` · Code : <span class="text-slate-300 font-mono">${escHtml(p.invite_code)}</span>` : ''}
      </p>
    </button>
  `).join('');

  list.querySelectorAll('.pool-pick').forEach(btn => {
    btn.addEventListener('click', async () => {
      await selectPool(+btn.dataset.poolId);
      renderPoolModal();
      document.getElementById('pool-modal')?.classList.add('hidden');
    });
  });
}

async function selectPool (poolId) {
  const pool = state.pools.find(p => p.id === poolId);
  if (!pool) return;
  state.currentPool = pool;
  API.setPoolId(pool.id);
  updatePoolSelectorLabel();
  refreshCurrentView();
}

function refreshCurrentView () {
  if (state.currentView === 'matches') renderMatches();
  else if (state.currentView === 'detail') navigateTo('matches');
  else if (state.currentView === 'standings') renderStandings();
  else if (state.currentView === 'profile') renderProfile();
  else if (state.currentView === 'chat') renderChat(true);
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

async function initNotifications(btn) {
  // Enregistre le service worker
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    btn.style.display = 'none';
    return;
  }

  const reg = await navigator.serviceWorker.register('/sw.js');

  // Vérifie le statut actuel
  const { subscribed } = await API.getNotifStatus().catch(() => ({ subscribed: false }));
  updateNotifBtn(btn, subscribed);

  btn.addEventListener('click', async () => {
    const isSubscribed = btn.dataset.subscribed === 'true';

    if (isSubscribed) {
      // Désabonner
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await API.unsubscribeNotif();
      updateNotifBtn(btn, false);
    } else {
      // Demande la permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Vous avez refusé les notifications.');
        return;
      }

      // Récupère la clé publique VAPID
      const { key: vapidKey } = await API.getVapidKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await API.subscribeNotif(sub);
      updateNotifBtn(btn, true);
    }
  });
}

async function renderProfile() {
  const el = document.getElementById('view-profile');
  if (!el) return;

  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;

  let profile;
  try {
    profile = await API.getProfile();
  } catch (e) {
    el.innerHTML = `<p class="text-red-400 text-sm text-center py-8">${escHtml(e.message)}</p>`;
    return;
  }
  if (!profile) return;

  const locked = !!profile.picks_locked;
  const teams = profile.teams || [];
  const scorers = profile.scorers || [];

  const AVATARS = [
    '⚽','🏆','🥅','🎯','🔥','⚡','💥','🌟','👑','🦁',
    '🐯','🦊','🐺','🦅','🦋','🌈','🎭','🎪','🚀','💎',
    '🍕','🌮','🎸','🎺','🥁','🏄','🤿','🧗','🏇','🤺',
    '🇫🇷','🇧🇷','🇩🇪','🇪🇸','🇵🇹','🇦🇷','🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇳🇱','🇲🇦','🇯🇵',
  ];

  const COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#64748b',
  ];

  el.innerHTML = `
    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Mon profil</p>

    <!-- Aperçu -->
    <div class="bg-surface border border-border rounded-xl p-4 mb-4 flex items-center gap-4">
      <div class="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
           id="preview-avatar-bg"
           style="background: ${profile.color}22; border: 2px solid ${profile.color}">
        <span id="preview-avatar">${profile.avatar || '⚽'}</span>
      </div>
      <div>
        <p class="font-semibold text-white text-lg">${profile.pseudo}</p>
        <p class="text-xs text-muted">${profile.role}</p>
      </div>
    </div>

    <!-- Choix avatar -->
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Choisis ton avatar</p>
      <div class="grid grid-cols-10 gap-2" id="avatar-grid">
        ${AVATARS.map(a => `
          <button class="avatar-btn text-xl p-1.5 rounded-lg transition hover:bg-white/10
                         ${a === (profile.avatar || '⚽') ? 'bg-white/20 ring-1 ring-white/40' : ''}"
                  data-avatar="${a}">${a}</button>
        `).join('')}
      </div>
    </div>

    <!-- Choix couleur -->
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Choisis ta couleur</p>
      <div class="flex flex-wrap gap-3" id="color-grid">
        ${COLORS.map(c => `
          <button class="color-btn w-8 h-8 rounded-full transition hover:scale-110
                         ${c === (profile.color || '#3b82f6') ? 'ring-2 ring-white ring-offset-2 ring-offset-bg scale-110' : ''}"
                  style="background: ${c}"
                  data-color="${c}"></button>
        `).join('')}
      </div>
      <!-- Couleur personnalisée -->
      <div class="flex items-center gap-3 mt-3">
        <input type="color" id="custom-color" value="${profile.color || '#3b82f6'}"
               class="w-8 h-8 rounded cursor-pointer border-0 bg-transparent">
        <span class="text-xs text-muted">Couleur personnalisée</span>
      </div>
    </div>

    <!-- Pronostics tournoi -->
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Pronostics tournoi</p>
      <p class="text-xs text-muted mb-3">Champion (+5 pts) · Meilleur buteur (+3 pts) · Groupe : <span class="text-slate-300">${escHtml(state.currentPool?.name || '—')}</span></p>
      ${locked
        ? '<p class="text-amber-400/90 text-xs mb-3">🔒 Verrouillé — le premier match a commencé, plus de modification possible.</p>'
        : '<p class="text-xs text-slate-500 mb-3">À enregistrer avant le coup d\'envoi du premier match.</p>'}
      ${profile.bonus_winner ? '<p class="text-green-400 text-xs mb-2">✓ Bon vainqueur : +5 pts</p>' : ''}
      ${profile.bonus_scorer ? '<p class="text-green-400 text-xs mb-2">✓ Bon meilleur buteur : +3 pts</p>' : ''}
      <label class="block text-xs text-muted mb-1">Nation vainqueur</label>
      ${teams.length
        ? `<p class="text-xs text-slate-500 mb-2">${teams.length} équipes disponibles</p>`
        : '<p class="text-xs text-red-400 mb-2">Liste des équipes indisponible — rechargez la page ou redémarrez le serveur.</p>'}
      <select id="pick-winner" class="input-field pick-select w-full mb-3 text-sm" ${locked ? 'disabled' : ''}>
        <option value="">— Choisir une équipe —</option>
        ${teams.map(t => `
          <option value="${attrEsc(t)}" ${t === (profile.pick_winner || '') ? 'selected' : ''}>${escHtml(t)}</option>
        `).join('')}
      </select>
      <label class="block text-xs text-muted mb-1">Meilleur buteur</label>
      <input id="pick-top-scorer" type="text" list="scorers-datalist"
             class="input-field w-full text-sm" placeholder="Nom du joueur"
             value="${attrEsc(profile.pick_top_scorer || '')}"
             ${locked ? 'disabled' : ''} />
      <datalist id="scorers-datalist">
        ${scorers.map(n => `<option value="${attrEsc(n)}">`).join('')}
      </datalist>
      ${!scorers.length && !locked
        ? '<p class="text-xs text-amber-400/90 mt-2">Liste des joueurs indisponible — demandez à l\'admin de synchroniser les sélections.</p>'
        : ''}
    </div>

    <!-- Bouton sauvegarder -->
    <button id="btn-save-profile"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition">
      ✓ Sauvegarder
    </button>
    <p id="profile-msg" class="text-xs text-center mt-2 hidden"></p>`;

  let selectedAvatar = profile.avatar || '⚽';
  let selectedColor  = profile.color  || '#3b82f6';

  // Sélection avatar
  el.querySelectorAll('.avatar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAvatar = btn.dataset.avatar;
      el.querySelectorAll('.avatar-btn').forEach(b =>
        b.className = b.className.replace(' bg-white/20 ring-1 ring-white/40', '')
      );
      btn.className += ' bg-white/20 ring-1 ring-white/40';
      document.getElementById('preview-avatar').textContent = selectedAvatar;
    });
  });

  // Sélection couleur
  el.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      el.querySelectorAll('.color-btn').forEach(b =>
        b.className = b.className.replace(' ring-2 ring-white ring-offset-2 ring-offset-bg scale-110', '')
      );
      btn.className += ' ring-2 ring-white ring-offset-2 ring-offset-bg scale-110';
      document.getElementById('custom-color').value = selectedColor;
      updatePreviewColor(selectedColor);
    });
  });

  // Couleur custom
  document.getElementById('custom-color').addEventListener('input', (e) => {
    selectedColor = e.target.value;
    updatePreviewColor(selectedColor);
  });

  // Sauvegarde
  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-profile');
    const msg = document.getElementById('profile-msg');
    btn.disabled = true;
    try {
      const pickWinner = document.getElementById('pick-winner')?.value || null;
      const pickScorer = document.getElementById('pick-top-scorer')?.value.trim() || null;

      const updated = await API.updateProfile({
        avatar: selectedAvatar,
        color: selectedColor,
        ...(!locked ? { pick_winner: pickWinner, pick_top_scorer: pickScorer } : {}),
      });
      state.user.avatar = selectedAvatar;
      state.user.color  = selectedColor;

      // Met à jour la ligne du joueur dans le classement en cache
      const row = state.standings.find(u => u.pseudo === state.user.pseudo);
      if (row) {
        row.avatar = selectedAvatar;
        row.color  = selectedColor;
      }
      if (state.currentView === 'standings') renderStandings();

      // Met à jour le header
      document.getElementById('header-pseudo').innerHTML = `
        <span style="font-size:14px">${selectedAvatar}</span>
        <span>${state.user.pseudo}</span>`;

      msg.textContent = '✓ Profil sauvegardé !';
      msg.className = 'text-xs text-center mt-2 text-green-400';
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 2000);
    } catch (e) {
      msg.textContent = e.message;
      msg.className = 'text-xs text-center mt-2 text-red-400';
      msg.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });

  function updatePreviewColor(color) {
    const bg = document.getElementById('preview-avatar-bg');
    bg.style.background = `${color}22`;
    bg.style.borderColor = color;
  }
}

function escHtml (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Échappement pour attributs HTML (guillemets doubles). */
function attrEsc (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function formDots (formStr) {
  if (!formStr) return '<span class="text-muted text-xs">—</span>';
  return formStr.split(' ').filter(Boolean).map(r => {
    const c = r === 'V' || r === 'W' ? 'W' : r === 'D' ? 'D' : r === 'N' ? 'D' : 'L';
    return `<span class="form-${c} w-5 h-5 rounded-full text-[10px] font-bold inline-flex items-center justify-center">${r === 'W' ? 'V' : r}</span>`;
  }).join('');
}

function matchLinesHtml (lines, emptyMsg = '—') {
  if (!lines?.length) return `<p class="text-xs text-muted">${emptyMsg}</p>`;
  return `<div class="space-y-1">${lines.map(l => {
    const venue = l.venue ? `<span class="text-[10px] px-1.5 py-0.5 rounded ${l.venue === 'V' ? 'bg-green-950 text-green-400' : l.venue === 'D' ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-400'}">${l.venue === 'V' ? 'V' : l.venue === 'D' ? 'D' : 'N'}</span>` : '';
    const meta = [l.date, l.competition].filter(Boolean).join(' · ');
    return `<div class="flex items-center gap-2 text-xs py-1 border-b border-border last:border-0">
      ${venue}
      <span class="text-slate-300 flex-1">${escHtml(teamName(l.opponent || '?'))}</span>
      <span class="font-semibold text-white">${escHtml(l.score || '')}</span>
      ${meta ? `<span class="text-muted text-[10px]">${escHtml(meta)}</span>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function teamIntelHtml (summary, teamName) {
  if (!summary?.found) return `
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        ${flagEmoji(teamName)} ${shortName(teamName)}
      </p>
      <p class="text-xs text-muted italic">Données non disponibles</p>
    </div>`;

  const friendlies = summary.friendlies_live || summary.friendlies || [];
  const qualMatches = summary.qualification_matches || [];

  return `
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <div class="flex items-start justify-between gap-2 mb-3">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider">
          ${flagEmoji(teamName)} ${shortName(teamName)}
        </p>
        ${summary.fifa_rank ? `<span class="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded-full shrink-0">FIFA #${summary.fifa_rank}</span>` : ''}
      </div>

      ${summary.history ? `<p class="text-xs text-slate-400 italic mb-3 leading-relaxed">${escHtml(summary.history)}</p>` : ''}

      <div class="grid grid-cols-2 gap-2 mb-3 text-xs">
        ${summary.best_wc ? `<div class="bg-bg rounded-lg p-2"><p class="text-muted text-[10px] mb-0.5">Meilleur résultat CdM</p><p class="text-white font-medium">${escHtml(summary.best_wc)}</p></div>` : ''}
        ${summary.wc_2022 || summary.wc_2018 ? `<div class="bg-bg rounded-lg p-2"><p class="text-muted text-[10px] mb-0.5">CdM récentes</p><p class="text-white">${summary.wc_2022 ? `2022: ${escHtml(summary.wc_2022)}` : ''}${summary.wc_2022 && summary.wc_2018 ? '<br>' : ''}${summary.wc_2018 ? `2018: ${escHtml(summary.wc_2018)}` : ''}</p></div>` : ''}
      </div>

      ${summary.qualification ? `
        <details class="intel-block mb-2" open>
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">🛤️ Parcours qualificatif</summary>
          <p class="text-xs text-slate-400 mt-1 mb-2">${escHtml(summary.qualification)}</p>
          ${matchLinesHtml(qualMatches)}
        </details>` : ''}

      ${summary.streak || summary.form_extended ? `
        <details class="intel-block mb-2">
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">📈 Série & forme</summary>
          <div class="mt-2 space-y-2">
            ${summary.streak ? `<p class="text-xs text-amber-400/90">Série : ${escHtml(summary.streak)}</p>` : ''}
            ${summary.form_extended ? `<div class="flex flex-wrap gap-1 items-center"><span class="text-[10px] text-muted mr-1">12 der. :</span>${formDots(summary.form_extended)}</div>` : ''}
          </div>
        </details>` : ''}

      ${friendlies.length ? `
        <details class="intel-block mb-2">
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">🤝 Matchs de préparation</summary>
          <div class="mt-2">${matchLinesHtml(friendlies.map(f => ({ opponent: f.opponent, score: f.score, date: f.date, venue: null })))}</div>
        </details>` : ''}

      ${summary.watch?.length ? `
        <details class="intel-block mb-2" open>
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">👀 Joueurs à surveiller</summary>
          <div class="flex flex-wrap gap-1.5 mt-2">
            ${summary.watch.map(p => `<span class="text-xs bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded-full">${escHtml(p)}</span>`).join('')}
          </div>
        </details>` : ''}

      ${summary.best ? `
        <details class="intel-block">
          <summary class="text-xs font-semibold text-slate-300 cursor-pointer py-1">📚 Fiche historique</summary>
          <div class="mt-2 space-y-1 text-xs">
            <p><span class="text-muted">Star actuelle :</span> <span class="text-white">${escHtml(summary.best)}</span></p>
            <p><span class="text-muted">Record capé :</span> <span class="text-white">${escHtml(summary.capped)}</span></p>
            <p><span class="text-muted">Record buteur :</span> <span class="text-white">${escHtml(summary.scorer)}</span></p>
          </div>
        </details>` : ''}
    </div>`;
}

function h2hHtml (h2h, home, away) {
  const meetings = h2h?.meetings || [];
  const total = h2h?.stats?.total;
  const more = total && total > meetings.length
    ? `<p class="text-[10px] text-muted italic mb-2">${total - meetings.length} match(s) plus ancien(s) non affiché(s).</p>`
    : '';
  return `
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        ⚔️ Confrontations directes
      </p>
      <p class="text-xs text-slate-400 mb-3">
        ${flagEmoji(home)} ${shortName(home)} vs ${flagEmoji(away)} ${shortName(away)}
      </p>
      ${h2h?.summary ? `<p class="text-xs text-slate-300 mb-3">${escHtml(translateTeamsInText(h2h.summary))}</p>` : ''}
      ${h2h?.stats ? `<p class="text-[10px] text-muted mb-2">${h2h.stats.played} matchs joués · ${teamName(h2h.team_a)}: ${h2h.stats.wins_a}V · N: ${h2h.stats.draws} · ${teamName(h2h.team_b)}: ${h2h.stats.wins_b}V${h2h.stats.upcoming ? ` · ${h2h.stats.upcoming} à venir` : ''}</p>` : ''}
      ${more}
      ${meetings.length ? `<div class="space-y-1">${meetings.map(mt => `
        <div class="text-xs py-1.5 border-b border-border last:border-0 flex flex-wrap gap-x-2">
          <span class="text-muted">${escHtml(mt.date || '')}</span>
          <span class="text-slate-400">${escHtml(mt.comp || '')}</span>
          <span class="font-semibold text-white">${escHtml(mt.score || '')}</span>
          ${mt.note ? `<span class="text-slate-400">${escHtml(translateTeamsInText(mt.note))}</span>` : ''}
        </div>`).join('')}</div>`
      : `<p class="text-xs text-muted italic">Aucune confrontation recensée.</p>`}
    </div>`;
}

function updateNotifBtn(btn, subscribed) {
  btn.dataset.subscribed = subscribed;
  btn.title = subscribed ? 'Notifications activées — cliquer pour désactiver' : 'Activer les notifications';
  btn.style.color = subscribed ? '#22c55e' : '';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/* ═══════════════════════════════════════════════════════════════
   Routeur
═══════════════════════════════════════════════════════════════ */
function navigateTo(view, params = {}) {
  if (view !== 'chat') stopChatPoll();
  if (view !== 'standings') destroyStatsCharts();

  ['matches', 'detail', 'standings', 'admin', 'tournament', 'profile', 'chat'].forEach(v => {
    document.getElementById(`view-${v}`)?.classList.add('hidden');
  });
  document.getElementById(`view-${view}`).classList.remove('hidden');
  state.currentView = view;

  if (view === 'matches') renderMatches();
  if (view === 'detail') renderDetail(params.matchId);
  if (view === 'standings') renderStandings();
  if (view === 'tournament') renderTournament();
  if (view === 'admin') renderAdmin();
  if (view === 'profile') renderProfile();
  if (view === 'chat') renderChat(true);
}

/* ═══════════════════════════════════════════════════════════════
   Vue : Chat (par groupe)
═══════════════════════════════════════════════════════════════ */
function formatChatTime (iso) {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return d.toLocaleString('fr-FR', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function chatMessageHtml (msg) {
  const emojis = state.chatEmojis.length ? state.chatEmojis : ['👍', '🔥', '😂', '🎯', '💪', '😱', '❤️', '🏆'];
  const reacted = new Set((msg.reactions || []).map(r => r.emoji));

  return `
    <div class="chat-msg" data-msg-id="${msg.id}">
      <div class="chat-meta ${msg.mine ? 'mine' : ''}">
        ${msg.mine ? `<span>${formatChatTime(msg.created_at)}</span>` : `
          <span class="w-5 h-5 rounded-full inline-flex items-center justify-center text-xs"
                style="background:${msg.color}22;border:1px solid ${msg.color}">${msg.avatar}</span>
          <span class="text-slate-400">${escHtml(msg.pseudo)}</span>
          <span>${formatChatTime(msg.created_at)}</span>`}
      </div>
      <div class="chat-bubble ${msg.mine ? 'mine' : 'theirs'}">${escHtml(msg.content)}</div>
      <div class="chat-reactions">
        ${(msg.reactions || []).map(r => `
          <button type="button" class="chat-react-pill ${r.mine ? 'mine' : ''}"
                  data-msg-id="${msg.id}" data-emoji="${r.emoji}"
                  title="${escHtml(r.users.join(', '))}">
            ${r.emoji} ${r.count}
          </button>`).join('')}
        ${emojis.filter(e => !reacted.has(e)).map(e => `
          <button type="button" class="chat-react-add" data-msg-id="${msg.id}" data-emoji="${e}"
                  title="Réagir">${e}</button>`).join('')}
      </div>
    </div>`;
}

function bindChatInteractions (root) {
  root.querySelectorAll('.chat-react-pill, .chat-react-add').forEach(btn => {
    btn.addEventListener('click', async () => {
      const messageId = +btn.dataset.msgId;
      const emoji = btn.dataset.emoji;
      try {
        await API.toggleChatReaction(messageId, emoji);
        await pollChatMessages(true);
      } catch (e) {
        console.warn('reaction:', e.message);
      }
    });
  });
}

function scrollChatToBottom () {
  const box = document.getElementById('chat-messages');
  if (box) box.scrollTop = box.scrollHeight;
}

async function pollChatMessages (fullRefresh = false) {
  if (state.currentView !== 'chat') return;
  try {
    const data = await API.getChatMessages(0);
    if (data.emojis?.length) state.chatEmojis = data.emojis;

    const incoming = data.messages || [];
    state.chatMessages = incoming;
    state.chatLastId = incoming.length
      ? Math.max(...incoming.map(m => m.id))
      : 0;

    const list = document.getElementById('chat-messages');
    if (!list) return;

    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;

    list.innerHTML = incoming.length
      ? incoming.map(chatMessageHtml).join('')
      : '<p class="text-xs text-muted text-center py-8">Aucun message — lancez la conversation !</p>';
    bindChatInteractions(list);

    if (fullRefresh || atBottom) scrollChatToBottom();
  } catch (e) {
    const err = document.getElementById('chat-error');
    if (err) {
      err.textContent = e.message;
      err.classList.remove('hidden');
    }
  }
}

async function renderChat (reset = false) {
  const el = document.getElementById('view-chat');
  if (!el) return;

  if (!state.currentPool) {
    el.innerHTML = '<p class="text-muted text-sm text-center p-8">Sélectionnez un groupe pour accéder au chat.</p>';
    stopChatPoll();
    return;
  }

  if (reset) {
    state.chatMessages = [];
    state.chatLastId = 0;
  }

  el.innerHTML = `
    <div class="px-4 py-3 border-b border-border bg-surface shrink-0">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider">Chat du groupe</p>
      <p class="text-sm text-white truncate">${escHtml(state.currentPool.name)}</p>
      <p id="chat-error" class="text-xs text-red-400 mt-1 hidden"></p>
    </div>
    <div id="chat-messages" class="chat-messages">
      <p class="text-xs text-muted text-center py-8">Chargement…</p>
    </div>
    <div class="chat-compose">
      <textarea id="chat-input" class="chat-input" rows="1" maxlength="500"
                placeholder="Écrire un message…"></textarea>
      <button id="btn-chat-send" type="button"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shrink-0">
        Envoyer
      </button>
    </div>`;

  const input = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-chat-send');

  async function sendMessage () {
    const text = input.value.trim();
    if (!text) return;
    btnSend.disabled = true;
    try {
      const msg = await API.sendChatMessage(text);
      input.value = '';
      document.getElementById('chat-error')?.classList.add('hidden');
      if (msg) {
        state.chatMessages.push(msg);
        state.chatLastId = Math.max(state.chatLastId, msg.id);
        const list = document.getElementById('chat-messages');
        const empty = list?.querySelector('.text-muted.text-center');
        if (empty) empty.remove();
        list?.insertAdjacentHTML('beforeend', chatMessageHtml(msg));
        bindChatInteractions(list);
        scrollChatToBottom();
      }
    } catch (e) {
      const err = document.getElementById('chat-error');
      if (err) {
        err.textContent = e.message;
        err.classList.remove('hidden');
      }
    } finally {
      btnSend.disabled = false;
      input.focus();
    }
  }

  btnSend?.addEventListener('click', sendMessage);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  await pollChatMessages(true);
  startChatPoll();
}

/* ═══════════════════════════════════════════════════════════════
   Vue : Matchs
═══════════════════════════════════════════════════════════════ */
async function renderMatches() {
  const el = document.getElementById('view-matches');
  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;
  try {
    state.matches = await API.getMatches();
  } catch (e) {
    el.innerHTML = `<p class="text-red-400 text-sm text-center py-8">${e.message}</p>`;
    return;
  }

  // Grouper par stage/groupe
  const groups = {};
  for (const m of state.matches) {
    const key = m.group_name
      ? `Groupe ${String(m.group_name).replace(/^GROUP_/i, '')}`
      : (m.stage || 'Phase finale');
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }

  let html = '';
  for (const [label, matches] of Object.entries(groups)) {
    html += `<p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3 mt-5 first:mt-0">${label}</p>`;
    for (const m of matches) html += matchCard(m);
  }
  el.innerHTML = html || `<p class="text-muted text-sm text-center py-12">Aucun match trouvé.</p>`;

  // Bind des inputs de pronostic
  el.querySelectorAll('.pred-form').forEach(form => {
    const mid = +form.dataset.matchId;
    const home = form.querySelector('.input-home');
    const away = form.querySelector('.input-away');
    const msg = form.querySelector('.pred-msg');

    async function save() {
      const h = parseInt(home.value);
      const a = parseInt(away.value);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
      try {
        await API.savePrediction(mid, h, a);
        msg.textContent = '✓ Enregistré';
        msg.className = 'pred-msg text-xs text-green-400 text-center mt-1';
      } catch (e) {
        msg.textContent = e.message;
        msg.className = 'pred-msg text-xs text-red-400 text-center mt-1';
      }
    }
    home.addEventListener('change', save);
    away.addEventListener('change', save);
  });

  // Bind des cartes pour la navigation vers le détail
  el.querySelectorAll('.match-card-link').forEach(card => {
    card.addEventListener('click', () => {
      navigateTo('detail', { matchId: +card.dataset.matchId });
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    });
  });
}

function matchCard(m) {
  const isLocked = m.is_locked;
  const now = new Date().toISOString();
  const statusBadge = (() => {
    if (m.status === 'LIVE') return `<span class="badge badge-live text-xs px-2 py-0.5 rounded-full">⬤ En cours</span>`;
    if (m.status === 'FINISHED') return `<span class="badge badge-done text-xs px-2 py-0.5 rounded-full">Terminé</span>`;
    if (isLocked) return `<span class="badge badge-locked text-xs px-2 py-0.5 rounded-full">🔒 Fermé</span>`;
    return `<span class="badge badge-open text-xs px-2 py-0.5 rounded-full">● Ouvert</span>`;
  })();

  const dateStr = new Date(m.match_date).toLocaleString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  // Score réel (si match commencé)
  const realScore = (m.status === 'LIVE' || m.status === 'FINISHED') && m.home_score !== null
    ? `<div class="text-lg font-bold ${m.status === 'LIVE' ? 'text-amber-400' : 'text-slate-200'}">
         ${m.home_score} – ${m.away_score}
       </div>
       <div class="text-xs text-muted text-center mt-0.5">Score réel</div>`
    : '';

  // Mon pronostic
  const myPred = m.user_prediction
    ? `<div class="text-xs text-center mt-1">
         Mon pronostic : <span class="font-semibold">${m.user_prediction.home}–${m.user_prediction.away}</span>
         ${m.user_prediction.points !== null
      ? `· <span class="${ptsCls(m.user_prediction.points)} px-1.5 py-0.5 rounded-full">${m.user_prediction.points} pt${m.user_prediction.points !== 1 ? 's' : ''}</span>`
      : ''}
       </div>`
    : '';

  // Formulaire de saisie (si pas verrouillé)
  const predForm = !isLocked
    ? `<div class="pred-form" data-match-id="${m.id}">
         <div class="flex items-center justify-center gap-2">
           <input class="score-input input-home" type="number" min="0" max="20"
                  value="${m.user_prediction?.home ?? ''}" placeholder="–">
           <span class="text-muted text-sm">–</span>
           <input class="score-input input-away" type="number" min="0" max="20"
                  value="${m.user_prediction?.away ?? ''}" placeholder="–">
         </div>
         <p class="pred-msg text-xs text-muted text-center mt-1">
           ${m.user_prediction ? '✓ Enregistré' : 'Entre ton pronostic'}
         </p>
       </div>`
    : realScore + myPred;

  return `
    <div class="bg-surface border border-border rounded-xl p-3 mb-3 transition"
     data-match-id="${m.id}">
    <div class="flex justify-between items-center mb-2">
      <span class="text-xs text-muted">${dateStr}</span>
      <div class="flex items-center gap-2">
        ${statusBadge}
        <button class="match-card-link text-xs text-muted hover:text-white border border-border hover:border-slate-500 px-2 py-0.5 rounded-lg transition"
                data-match-id="${m.id}">
          Détails →
        </button>
      </div>
    </div>
    <div class="flex items-center justify-between gap-2">
      <div class="flex-1 text-center">
        <span class="text-2xl block mb-1">${flagEmoji(m.home_team)}</span>
        <span class="text-xs font-medium text-slate-300">${shortName(m.home_team)}</span>
      </div>
      <div class="flex-shrink-0 min-w-[90px]">${predForm}</div>
      <div class="flex-1 text-center">
        <span class="text-2xl block mb-1">${flagEmoji(m.away_team)}</span>
        <span class="text-xs font-medium text-slate-300">${shortName(m.away_team)}</span>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   Vue : Détail match
═══════════════════════════════════════════════════════════════ */
async function renderDetail(matchId) {
  const el = document.getElementById('view-detail');
  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;
  let data;
  try { data = await API.getMatch(matchId); }
  catch (e) { el.innerHTML = `<p class="text-red-400 text-sm">${e.message}</p>`; return; }

  const { match: m, is_locked, my_prediction, all_predictions, home_stats, away_stats } = data;

  const formHtml = (stats) => {
    if (!stats?.form) return '<span class="text-muted text-xs">—</span>';
    return stats.form.split(' ').map(r =>
      `<span class="form-${r} w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">${r}</span>`
    ).join('');
  };

  // Charge fiches équipes, effectifs et H2H
  const [homeSummary, awaySummary, homeSquad, awaySquad, h2h] = await Promise.all([
    API.getTeamSummary(m.home_team).catch(() => null),
    API.getTeamSummary(m.away_team).catch(() => null),
    API.getSquad(m.home_team).catch(() => null),
    API.getSquad(m.away_team).catch(() => null),
    API.getH2H(m.home_team, m.away_team).catch(() => null),
  ]);

  const squadHtml = (squadData, teamName) => {
    const players = squadData?.squad || [];
    if (!players.length) return `
      <div class="bg-surface border border-border rounded-xl p-3 h-full">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          ${flagEmoji(teamName)} Sélection — ${shortName(teamName)}
        </p>
        <p class="text-xs text-muted italic">Effectif indisponible</p>
      </div>`;

    const byPos = {
      Gardiens: players.filter(p => ['GK'].includes(p.position)),
      Défenseurs: players.filter(p => ['DF', 'DEF', 'CB', 'LB', 'RB', 'WB'].includes(p.position)),
      Milieux: players.filter(p => ['MID', 'MF', 'CM', 'DM', 'AM'].includes(p.position)),
      Attaquants: players.filter(p => ['FW', 'ATT', 'ST', 'LW', 'RW', 'SS'].includes(p.position)),
      Autres: players.filter(p => !['GK', 'DF', 'DEF', 'CB', 'LB', 'RB', 'WB', 'MID', 'MF', 'CM', 'DM', 'AM', 'FW', 'ATT', 'ST', 'LW', 'RW', 'SS'].includes(p.position)),
    };

    const posEmoji = { Gardiens: '🧤', Défenseurs: '🛡️', Milieux: '⚙️', Attaquants: '⚡', Autres: '👤' };

    let html = `
      <div class="bg-surface border border-border rounded-xl p-3 h-full">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          ${flagEmoji(teamName)} Sélection — ${shortName(teamName)}
          <span class="font-normal">(${players.length} joueurs)</span>
        </p>`;

    for (const [pos, group] of Object.entries(byPos)) {
      if (!group.length) continue;
      html += `
        <p class="text-xs text-muted mt-3 mb-2 font-semibold">${posEmoji[pos]} ${pos}</p>
        <div class="space-y-1">
          ${group.map(p => `
            <div class="flex items-center gap-2 py-1 border-b border-border last:border-0">
              <!-- <span class="text-xs text-muted w-5 text-center">${p.jersey_number ?? '—'}</span> -->
              <span class="flex-1 text-xs text-slate-200">${p.name}</span>
              <!-- <span class="text-xs text-muted">${p.club ?? ''}</span> -->
              ${p.caps ? `<span class="text-xs text-blue-400 ml-1">${p.caps} sél.</span>` : ''}
            </div>`).join('')}
        </div>`;
    }

    html += `</div>`;
    return html;
  };

  const predsHtml = is_locked && all_predictions.length
    ? all_predictions.map((p, i) => `
        <div class="flex items-center gap-3 py-2 border-b border-border last:border-0">
          <span class="text-sm text-muted w-5 text-center">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
          <span class="flex-1 text-sm ${p.pseudo === state.user.pseudo ? 'text-white font-semibold' : 'text-slate-300'}">${p.pseudo}</span>
          <span class="text-sm font-semibold">${p.predicted_home} – ${p.predicted_away}</span>
          ${p.points !== null
        ? `<span class="${ptsCls(p.points)} text-xs px-2 py-0.5 rounded-full">${p.points} pt${p.points !== 1 ? 's' : ''}</span>`
        : '<span class="text-xs text-muted">—</span>'}
        </div>`
    ).join('')
    : `<p class="text-muted text-xs py-3 text-center">
         ${is_locked ? 'Aucun pronostic.' : 'Pronostics révélés au coup d\'envoi 🔒'}
       </p>`;

  el.innerHTML = `
    <button id="btn-back" class="flex items-center gap-1 text-muted text-sm mb-4 hover:text-white transition">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      Retour
    </button>

    <!-- En-tête match -->
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex-1 text-center">
          <span class="text-4xl block mb-2">${flagEmoji(m.home_team)}</span>
          <span class="text-sm font-medium">${shortName(m.home_team)}</span>
        </div>
        <div class="text-center px-4">
          ${m.status === 'FINISHED' || m.status === 'LIVE'
      ? `<div class="text-2xl font-bold ${m.status === 'LIVE' ? 'text-amber-400' : ''}">${m.home_score} – ${m.away_score}</div>`
      : `<div class="text-lg font-bold text-muted">vs</div>`}
          <div class="text-xs text-muted mt-1">
            ${new Date(m.match_date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
          ${my_prediction
      ? `<div class="text-xs mt-2">Mon pronostic : <strong>${my_prediction.predicted_home}–${my_prediction.predicted_away}</strong>
               ${my_prediction.points !== null
        ? `<span class="${ptsCls(my_prediction.points)} ml-1 px-1.5 py-0.5 rounded-full">${my_prediction.points} pt${my_prediction.points !== 1 ? 's' : ''}</span>`
        : ''}</div>`
      : ''}
        </div>
        <div class="flex-1 text-center">
          <span class="text-4xl block mb-2">${flagEmoji(m.away_team)}</span>
          <span class="text-sm font-medium">${shortName(m.away_team)}</span>
        </div>
      </div>

      <!-- Forme des équipes -->
      <div class="grid grid-cols-2 gap-4 border-t border-border pt-3">
        <div>
          <p class="text-xs text-muted mb-2 text-center">Forme (5 der.)</p>
          <div class="flex gap-1 justify-center">${formHtml(home_stats)}</div>
        </div>
        <div>
          <p class="text-xs text-muted mb-2 text-center">Forme (5 der.)</p>
          <div class="flex gap-1 justify-center">${formHtml(away_stats)}</div>
        </div>
      </div>
    </div>

    <!-- Fiches équipes -->
    ${teamIntelHtml(homeSummary, m.home_team)}
    ${teamIntelHtml(awaySummary, m.away_team)}

    <!-- Historique des confrontations -->
    ${h2hHtml(h2h, m.home_team, m.away_team)}

    <!-- Effectifs (côte à côte) -->
    <div class="grid grid-cols-2 gap-3 mb-4 items-start">
      ${squadHtml(homeSquad, m.home_team)}
      ${squadHtml(awaySquad, m.away_team)}
    </div>

    <!-- Pronostics de tous les joueurs -->
    <div class="bg-surface border border-border rounded-xl p-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Pronostics des joueurs</p>
      ${predsHtml}
    </div>`;

  document.getElementById('btn-back').addEventListener('click', () => navigateTo('matches'));
}

/* ═══════════════════════════════════════════════════════════════
   Vue : Classement & Statistiques
═══════════════════════════════════════════════════════════════ */
function destroyStatsCharts () {
  for (const c of state.statsCharts) {
    try { c.destroy(); } catch { /* ignore */ }
  }
  state.statsCharts = [];
}

function standingsTableHtml (rows) {
  const medals = ['🥇', '🥈', '🥉'];
  return rows.map((u, i) => `
    <div class="flex items-center gap-3 bg-surface border border-border ${i === 0 ? 'rank-1' : ''} rounded-xl px-4 py-3 mb-2">
      <span class="text-base w-6 text-center">${medals[i] ?? `<span class="text-muted text-sm">${i + 1}</span>`}</span>
      <span class="flex-1 text-sm flex items-center gap-2">
        <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style="background:${u.color || '#3b82f6'}22; border:1px solid ${u.color || '#3b82f6'}">
          ${u.avatar || '⚽'}
        </span>
        <span class="${u.pseudo === state.user?.pseudo ? 'text-white font-semibold' : 'text-slate-300'}">
          ${escHtml(u.pseudo)}
        </span>
      </span>
      <span class="text-blue-400 font-bold text-sm">${u.total_points} pts</span>
      <span class="text-xs text-muted ml-1">
        <span class="text-green-400">${u.exact_scores}✓</span>
        <span class="text-purple-400 ml-1">${u.good_results}↗</span>
        ${u.bonus_winner ? '<span class="text-amber-400 ml-1" title="Vainqueur">🏆</span>' : ''}
        ${u.bonus_scorer ? '<span class="text-yellow-400" title="Meilleur buteur">⚽</span>' : ''}
      </span>
    </div>`).join('');
}

function renderStatsCharts (stats) {
  if (typeof Chart === 'undefined') return;

  destroyStatsCharts();
  const commonOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', boxWidth: 12, font: { size: 10 } },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxRotation: 45, font: { size: 9 } },
        grid: { color: '#1e2535' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: '#1e2535' },
      },
    },
  };

  const ptsCtx = document.getElementById('chart-points');
  if (ptsCtx && stats.points_series?.length) {
    state.statsCharts.push(new Chart(ptsCtx, {
      type: 'line',
      data: {
        labels: stats.labels,
        datasets: stats.points_series.map(s => ({
          label: s.pseudo,
          data: s.points,
          borderColor: s.color,
          backgroundColor: `${s.color}33`,
          tension: 0.25,
          pointRadius: 2,
          borderWidth: 2,
        })),
      },
      options: {
        ...commonOpts,
        plugins: { ...commonOpts.plugins, title: { display: false } },
        scales: {
          ...commonOpts.scales,
          y: { ...commonOpts.scales.y, beginAtZero: true, title: { display: true, text: 'Points', color: '#64748b' } },
        },
      },
    }));
  }

  const rankCtx = document.getElementById('chart-ranks');
  if (rankCtx && stats.points_series?.length) {
    const maxRank = stats.players.length || 1;
    state.statsCharts.push(new Chart(rankCtx, {
      type: 'line',
      data: {
        labels: stats.labels,
        datasets: stats.points_series.map(s => ({
          label: s.pseudo,
          data: s.ranks,
          borderColor: s.color,
          backgroundColor: `${s.color}22`,
          tension: 0.25,
          pointRadius: 2,
          borderWidth: 2,
        })),
      },
      options: {
        ...commonOpts,
        scales: {
          ...commonOpts.scales,
          y: {
            ...commonOpts.scales.y,
            reverse: true,
            min: 1,
            max: maxRank,
            ticks: { stepSize: 1, color: '#64748b' },
            title: { display: true, text: 'Rang', color: '#64748b' },
          },
        },
      },
    }));
  }

  const distCtx = document.getElementById('chart-distribution');
  if (distCtx) {
    const d = stats.distribution;
    state.statsCharts.push(new Chart(distCtx, {
      type: 'doughnut',
      data: {
        labels: ['Scores exacts (3 pts)', 'Bons résultats (1 pt)', 'Ratés (0 pt)'],
        datasets: [{
          data: [d.exact_scores, d.good_results, d.wrong],
          backgroundColor: ['#22c55e', '#a855f7', '#475569'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } },
        },
      },
    }));
  }

  const barCtx = document.getElementById('chart-bars');
  if (barCtx && stats.players?.length) {
    state.statsCharts.push(new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: stats.players.map(p => p.pseudo),
        datasets: [
          {
            label: 'Points matchs',
            data: stats.players.map(p => p.match_points),
            backgroundColor: stats.players.map(p => `${p.color}99`),
            borderColor: stats.players.map(p => p.color),
            borderWidth: 1,
          },
          {
            label: 'Bonus',
            data: stats.players.map(p => p.total_points - p.match_points),
            backgroundColor: '#f59e0b88',
            borderColor: '#f59e0b',
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonOpts,
        scales: {
          x: { ...commonOpts.scales.x, stacked: true },
          y: { ...commonOpts.scales.y, stacked: true, beginAtZero: true },
        },
        plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
      },
    }));
  }
}

function statsPanelHtml (stats) {
  const playerCards = (stats.players || []).map(p => `
    <div class="stat-card">
      <div class="flex items-center gap-2 mb-2">
        <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style="background:${p.color}22;border:1px solid ${p.color}">${p.avatar}</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-white truncate">${escHtml(p.pseudo)}</p>
          <p class="text-[10px] text-muted">#${p.current_rank} · ${p.total_points} pts</p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><p class="text-green-400 font-bold">${p.exact_scores}</p><p class="text-muted">Exact</p></div>
        <div><p class="text-purple-400 font-bold">${p.good_results}</p><p class="text-muted">Bon</p></div>
        <div><p class="text-slate-500 font-bold">${p.wrong}</p><p class="text-muted">Raté</p></div>
      </div>
      <p class="text-[10px] text-muted mt-2 text-center">
        Précision ${p.accuracy_pct}% · Moy. ${p.avg_points} pt/match
      </p>
    </div>`).join('');

  return `
    <p class="text-xs text-slate-400 mb-4">
      ${stats.finished_matches} match(s) terminé(s)${stats.has_bonus ? ' · bonus inclus' : ''}
    </p>

    <div class="bg-surface border border-border rounded-xl p-3 mb-4">
      <p class="text-xs font-semibold text-slate-300 mb-2">Évolution des points</p>
      <div class="chart-wrap tall"><canvas id="chart-points"></canvas></div>
    </div>

    <div class="bg-surface border border-border rounded-xl p-3 mb-4">
      <p class="text-xs font-semibold text-slate-300 mb-2">Évolution du classement</p>
      <p class="text-[10px] text-muted mb-2">1 = 1er · axe inversé (monter = mieux classé)</p>
      <div class="chart-wrap tall"><canvas id="chart-ranks"></canvas></div>
    </div>

    <div class="grid grid-cols-1 gap-4 mb-4">
      <div class="bg-surface border border-border rounded-xl p-3">
        <p class="text-xs font-semibold text-slate-300 mb-2">Répartition des pronos (groupe)</p>
        <div class="chart-wrap"><canvas id="chart-distribution"></canvas></div>
      </div>
      <div class="bg-surface border border-border rounded-xl p-3">
        <p class="text-xs font-semibold text-slate-300 mb-2">Points par joueur</p>
        <div class="chart-wrap"><canvas id="chart-bars"></canvas></div>
      </div>
    </div>

    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Fiche joueur</p>
    <div class="grid grid-cols-2 gap-2 mb-4">${playerCards || '<p class="text-muted text-xs col-span-2">Aucune donnée.</p>'}</div>`;
}

async function renderStandings() {
  const el = document.getElementById('view-standings');
  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;

  let stats;
  try {
    const [standingsResult, statsResult] = await Promise.all([
      API.getStandings(),
      API.getAdvancedStats(),
    ]);
    state.standings = Array.isArray(standingsResult) ? standingsResult : [];
    stats = statsResult;
  } catch (e) {
    el.innerHTML = `<p class="text-red-400 text-sm">${escHtml(e.message)}</p>`;
    return;
  }

  const tab = state.standingsTab || 'table';
  const rows = standingsTableHtml(state.standings);

  el.innerHTML = `
    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Classement</p>
    <p class="text-xs text-slate-400 mb-3">${escHtml(state.currentPool?.name || 'Groupe')}</p>

    <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
      <button type="button" class="stats-tab ${tab === 'table' ? 'active' : ''}" data-standings-tab="table">📋 Tableau</button>
      <button type="button" class="stats-tab ${tab === 'stats' ? 'active' : ''}" data-standings-tab="stats">📊 Statistiques</button>
    </div>

    <div id="standings-panel-table" class="${tab === 'table' ? '' : 'hidden'}">
      ${rows || '<p class="text-muted text-sm text-center py-8">Aucun joueur.</p>'}
      <div class="mt-4 bg-surface border border-border rounded-xl p-3">
        <p class="text-xs text-muted mb-2">Légende</p>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <span><span class="text-green-400">✓</span> Score exact (3 pts)</span>
          <span><span class="text-purple-400">↗</span> Bon résultat (1 pt)</span>
          <span><span class="text-amber-400">🏆</span> Vainqueur (5 pts)</span>
          <span><span class="text-yellow-400">⚽</span> Meilleur buteur (3 pts)</span>
        </div>
      </div>
    </div>

    <div id="standings-panel-stats" class="${tab === 'stats' ? '' : 'hidden'}">
      ${statsPanelHtml(stats)}
    </div>`;

  el.querySelectorAll('[data-standings-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.standingsTab = btn.dataset.standingsTab;
      renderStandings();
    });
  });

  if (tab === 'stats') {
    requestAnimationFrame(() => renderStatsCharts(stats));
  } else {
    destroyStatsCharts();
  }
}

/* ═══════════════════════════════════════════════════════════════
   Vue : Tableau
═══════════════════════════════════════════════════════════════ */
async function renderTournament() {
  const el = document.getElementById('view-tournament');
  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;

  let data;
  try { data = await API.getTournament(); }
  catch (e) { el.innerHTML = `<p class="text-red-400 text-sm">${e.message}</p>`; return; }

  const { groups, knockout } = data;

  // ── Onglets ──────────────────────────────────────────────
  let html = `
    <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
      <button class="tour-tab active flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-blue-700 bg-blue-900 text-blue-300" data-tab="groups">Groupes</button>
      <button class="tour-tab flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border text-muted" data-tab="knockout">Phases finales</button>
    </div>

    <!-- Tab Groupes -->
    <div id="tab-groups">`;

  // ── Groupes ───────────────────────────────────────────────
  for (const [groupName, group] of Object.entries(groups).sort()) {
    html += `
      <div class="mb-6">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Groupe ${groupName}</p>

        <!-- Classement du groupe -->
        <div class="bg-surface border border-border rounded-xl overflow-hidden mb-3">
          <div class="grid grid-cols-12 gap-1 px-3 py-1.5 border-b border-border">
            <span class="col-span-1 text-xs text-muted">#</span>
            <span class="col-span-5 text-xs text-muted">Équipe</span>
            <span class="col-span-1 text-xs text-muted text-center">J</span>
            <span class="col-span-1 text-xs text-muted text-center">G</span>
            <span class="col-span-1 text-xs text-muted text-center">N</span>
            <span class="col-span-1 text-xs text-muted text-center">P</span>
            <span class="col-span-1 text-xs text-muted text-center">Diff</span>
            <span class="col-span-1 text-xs text-blue-400 text-center font-semibold">Pts</span>
          </div>
          ${group.standings.map((t, i) => `
            <div class="grid grid-cols-12 gap-1 px-3 py-2 border-b border-border last:border-0 ${i < 2 ? 'bg-green-950/20' : ''}">
              <span class="col-span-1 text-xs ${i < 2 ? 'text-green-400 font-semibold' : 'text-muted'}">${i + 1}</span>
              <span class="col-span-5 text-xs flex items-center gap-1">
                <span>${flagEmoji(t.team)}</span>
                <span class="${i < 2 ? 'text-white' : 'text-slate-300'}">${shortName(t.team)}</span>
              </span>
              <span class="col-span-1 text-xs text-muted text-center">${t.j}</span>
              <span class="col-span-1 text-xs text-green-400 text-center">${t.g}</span>
              <span class="col-span-1 text-xs text-muted text-center">${t.n}</span>
              <span class="col-span-1 text-xs text-red-400 text-center">${t.p}</span>
              <span class="col-span-1 text-xs text-center ${t.diff > 0 ? 'text-green-400' : t.diff < 0 ? 'text-red-400' : 'text-muted'}">${t.diff > 0 ? '+' : ''}${t.diff}</span>
              <span class="col-span-1 text-xs text-blue-400 text-center font-bold">${t.pts}</span>
            </div>`).join('')}
        </div>

        <!-- Matchs du groupe -->
        <div class="space-y-2">
          ${group.matches.map(m => matchRowHtml(m)).join('')}
        </div>
      </div>`;
  }

  html += `</div>

    <!-- Tab Phases finales -->
    <div id="tab-knockout" class="hidden">`;

  // ── Phases finales ────────────────────────────────────────
  const knockoutLabels = {
    ROUND_OF_32:    { label: '32èmes de finale', emoji: '⚽' },
    ROUND_OF_16:    { label: '16èmes de finale', emoji: '🔥' },
    QUARTER_FINALS: { label: 'Quarts de finale', emoji: '💥' },
    SEMI_FINALS:    { label: 'Demi-finales',      emoji: '⚡' },
    THIRD_PLACE:    { label: 'Match 3e place',    emoji: '🥉' },
    FINAL:          { label: 'Finale',            emoji: '🏆' },
  };

  let hasKnockout = false;
  for (const [stage, matches] of Object.entries(knockout)) {
    if (!matches.length) continue;
    hasKnockout = true;
    html += `
      <div class="mb-6">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          ${knockoutLabels[stage]?.emoji} ${knockoutLabels[stage]?.label || stage}
        </p>
        <div class="space-y-2">
          ${matches.map(m => matchRowHtml(m)).join('')}
        </div>
      </div>`;
  }

  if (!hasKnockout) {
    html += `
      <div class="text-center py-12">
        <p class="text-4xl mb-3">🏆</p>
        <p class="text-sm text-muted">Les phases finales débuteront après la phase de groupes</p>
      </div>`;
  }

  html += `</div>`;
  el.innerHTML = html;

  // ── Onglets switch ────────────────────────────────────────
  el.querySelectorAll('.tour-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.tour-tab').forEach(b => {
        b.className = 'tour-tab flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border text-muted';
      });
      btn.className = 'tour-tab active flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-blue-700 bg-blue-900 text-blue-300';
      document.getElementById('tab-groups').classList.add('hidden');
      document.getElementById('tab-knockout').classList.add('hidden');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    });
  });

  // ── Clic sur un match → détail ────────────────────────────
  el.querySelectorAll('.match-row').forEach(row => {
    row.addEventListener('click', () => {
      navigateTo('detail', { matchId: +row.dataset.matchId });
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    });
  });
}

// ── Helper : ligne de match ───────────────────────────────
function matchRowHtml(m) {
  const dateStr = new Date(m.match_date).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  const statusBadge = (() => {
    if (m.status === 'LIVE')     return `<span class="badge badge-live text-xs px-1.5 py-0.5 rounded-full">⬤</span>`;
    if (m.status === 'FINISHED') return `<span class="badge badge-done text-xs px-1.5 py-0.5 rounded-full">✓</span>`;
    return `<span class="text-xs text-muted">${dateStr}</span>`;
  })();

  const scoreHtml = (m.status === 'FINISHED' || m.status === 'LIVE') && m.home_score !== null
    ? `<span class="text-sm font-bold ${m.status === 'LIVE' ? 'text-amber-400' : 'text-white'}">${m.home_score} – ${m.away_score}</span>`
    : `<span class="text-xs text-muted">vs</span>`;

  return `
    <div class="match-row bg-surface border border-border rounded-xl px-3 py-2.5 cursor-pointer hover:border-slate-600 transition flex items-center gap-2"
         data-match-id="${m.id}">
      <div class="flex-1 flex items-center gap-1.5 justify-end">
        <span class="text-xs ${m.status === 'FINISHED' ? 'text-slate-400' : 'text-slate-200'} text-right">${shortName(m.home_team)}</span>
        <span class="text-lg">${flagEmoji(m.home_team)}</span>
      </div>
      <div class="flex flex-col items-center min-w-[60px]">
        ${scoreHtml}
        <div class="mt-0.5">${statusBadge}</div>
      </div>
      <div class="flex-1 flex items-center gap-1.5">
        <span class="text-lg">${flagEmoji(m.away_team)}</span>
        <span class="text-xs ${m.status === 'FINISHED' ? 'text-slate-400' : 'text-slate-200'}">${shortName(m.away_team)}</span>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   Vue : Admin
═══════════════════════════════════════════════════════════════ */
async function renderAdmin() {
  if (state.user?.role !== 'admin') return;
  const el = document.getElementById('view-admin');
  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;

  let users = [], logs = [], comp = { teams: [], scorers: [], winner_team: null, top_scorer: null };
  try {
    [users, logs, comp] = await Promise.all([
      API.getUsers(),
      API.getSyncLog(),
      API.getCompetitionResults(),
    ]);
  } catch (e) { el.innerHTML = `<p class="text-red-400 text-sm">${e.message}</p>`; return; }

  el.innerHTML = `
    <!-- Résultats tournoi (bonus) -->
    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Résultats tournoi (bonus)</p>
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs text-muted mb-3">Définir le champion et le meilleur buteur pour attribuer +5 / +3 pts aux joueurs.</p>
      <label class="block text-xs text-muted mb-1">Vainqueur</label>
      <select id="admin-winner" class="input-field w-full mb-3 text-sm">
        <option value="">— Non défini —</option>
        ${(comp.teams || []).map(t => `
          <option value="${attrEsc(t)}" ${t === (comp.winner_team || '') ? 'selected' : ''}>${escHtml(t)}</option>
        `).join('')}
      </select>
      <label class="block text-xs text-muted mb-1">Meilleur buteur</label>
      <input id="admin-top-scorer" type="text" list="admin-scorers-list" class="input-field w-full text-sm mb-3"
             value="${attrEsc(comp.top_scorer || '')}" placeholder="Nom exact du joueur" />
      <datalist id="admin-scorers-list">
        ${(comp.scorers || []).map(n => `<option value="${attrEsc(n)}">`).join('')}
      </datalist>
      <button id="btn-save-competition" class="w-full text-xs bg-amber-950 border border-amber-800 text-amber-300 py-2 rounded-lg hover:bg-amber-900 transition">
        Enregistrer les résultats
      </button>
      <p id="competition-msg" class="text-xs text-center mt-2 hidden"></p>
    </div>

    <!-- Synchronisation -->
    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Synchronisation API</p>
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <div class="flex gap-3 flex-wrap">
        <button id="btn-sync-fixtures" class="sync-btn text-xs bg-green-950 border border-green-900 text-green-400 px-4 py-2 rounded-lg hover:bg-green-900 transition">
          ⟳ Calendrier
        </button>
        <button id="btn-sync-scores" class="sync-btn text-xs bg-green-950 border border-green-900 text-green-400 px-4 py-2 rounded-lg hover:bg-green-900 transition">
          ⟳ Scores
        </button>
        <button id="btn-sync-forms" class="sync-btn text-xs bg-green-950 border border-green-900 text-green-400 px-4 py-2 rounded-lg hover:bg-green-900 transition">
          ⟳ Forme des équipes
        </button>
        <button id="btn-sync-squads" class="sync-btn text-xs bg-green-950 border border-green-900 text-green-400 px-4 py-2 rounded-lg hover:bg-green-900 transition">
          ⟳ Sélections
        </button>
      </div>
      ${logs.length
      ? `<p class="text-xs text-muted mt-3">Dernière sync : ${new Date(logs[0].ran_at).toLocaleString('fr-FR')} — <span class="${logs[0].status === 'ok' ? 'text-green-400' : 'text-red-400'}">${logs[0].status}</span></p>`
      : ''}
    </div>

    <!-- Créer un joueur -->
    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Ajouter un joueur</p>
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <div class="flex gap-2 mb-2">
        <input id="new-pseudo"   type="text"     placeholder="Pseudo"       class="input-field flex-1 text-sm" />
        <input id="new-password" type="password" placeholder="Mot de passe" class="input-field flex-1 text-sm" />
      </div>
      <button id="btn-create-user" class="w-full text-xs bg-blue-900 border border-blue-700 text-blue-300 py-2 rounded-lg hover:bg-blue-800 transition">
        + Créer le compte
      </button>
      <p id="create-msg" class="text-xs text-center mt-2 hidden"></p>
    </div>

    <!-- Liste des joueurs -->
    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Joueurs (${users.length})</p>
    <div class="bg-surface border border-border rounded-xl overflow-hidden mb-6">
      ${users.map(u => `
        <div class="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
          <span class="flex-1 text-sm ${u.role === 'admin' ? 'text-white font-semibold' : 'text-slate-300'}">${u.pseudo}</span>
          <span class="text-xs text-muted">${u.role}</span>
          ${u.role !== 'admin'
          ? `<button class="btn-delete text-xs bg-red-950 border border-red-900 text-red-400 px-3 py-1 rounded-lg hover:bg-red-900 transition"
                       data-user-id="${u.id}">Supprimer</button>`
          : ''}
        </div>`).join('')}
    </div>`;

  document.getElementById('btn-save-competition').addEventListener('click', async () => {
    const msg = document.getElementById('competition-msg');
    try {
      await API.setCompetitionResults({
        winner_team: document.getElementById('admin-winner').value || null,
        top_scorer: document.getElementById('admin-top-scorer').value.trim() || null,
      });
      msg.textContent = '✓ Résultats enregistrés — classement mis à jour';
      msg.className = 'text-xs text-center mt-2 text-green-400';
      msg.classList.remove('hidden');
      if (state.currentView === 'standings') renderStandings();
    } catch (e) {
      msg.textContent = e.message;
      msg.className = 'text-xs text-center mt-2 text-red-400';
      msg.classList.remove('hidden');
    }
  });

  // Synchro
  document.getElementById('btn-sync-fixtures').addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = '⟳ En cours…';
    try { await API.syncFixtures(); e.target.textContent = '✓ Fait'; }
    catch (err) { e.target.textContent = `✗ ${err.message}`; }
    setTimeout(() => { e.target.textContent = '⟳ Calendrier'; e.target.disabled = false; }, 3000);
  });
  document.getElementById('btn-sync-scores').addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = '⟳ En cours…';
    try { await API.syncScores(); e.target.textContent = '✓ Fait'; }
    catch (err) { e.target.textContent = `✗ ${err.message}`; }
    setTimeout(() => { e.target.textContent = '⟳ Scores'; e.target.disabled = false; }, 3000);
  });

  document.getElementById('btn-sync-forms').addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = '⟳ En cours…';
    try { await API.syncForms(); e.target.textContent = '✓ Fait'; }
    catch (err) { e.target.textContent = `✗ ${err.message}`; }
    setTimeout(() => { e.target.textContent = '⟳ Forme des équipes'; e.target.disabled = false; }, 3000);
  });

  // Créer joueur
  document.getElementById('btn-create-user').addEventListener('click', async () => {
    const pseudo = document.getElementById('new-pseudo').value.trim();
    const password = document.getElementById('new-password').value;
    const msg = document.getElementById('create-msg');
    try {
      await API.createUser({ pseudo, password });
      msg.textContent = `✓ ${pseudo} créé !`;
      msg.className = 'text-xs text-center mt-2 text-green-400';
      msg.classList.remove('hidden');
      document.getElementById('new-pseudo').value = '';
      document.getElementById('new-password').value = '';
      setTimeout(() => renderAdmin(), 1200);
    } catch (e) {
      msg.textContent = e.message;
      msg.className = 'text-xs text-center mt-2 text-red-400';
      msg.classList.remove('hidden');
    }
  });

  // Supprimer joueur
  el.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Supprimer ce joueur ?`)) return;
      try { await API.deleteUser(btn.dataset.userId); renderAdmin(); }
      catch (e) { alert(e.message); }
    });
  });

  document.getElementById('btn-sync-squads').addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = '⟳ En cours…';
    try { await API.syncSquads(); e.target.textContent = '✓ Fait'; }
    catch (err) { e.target.textContent = `✗ ${err.message}`; }
    setTimeout(() => { e.target.textContent = '⟳ Sélections'; e.target.disabled = false; }, 3000);
  });
}

/* ═══════════════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════════════ */
function ptsCls(pts) {
  if (pts === 3) return 'pts-3';
  if (pts === 1) return 'pts-1';
  return 'pts-0';
}

function shortName(name) {
  const translated = teamName(name);
  return translated.length > 14 ? translated.slice(0, 13) + '…' : translated;
}

// Drapeau emoji basique par nom de pays (enrichir selon les équipes de la CdM)
const FLAGS = {
  'Mexico': '🇲🇽',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Czechia': '🇨🇿',
  'Canada': '🇨🇦',
  'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭',
  'Bosnia-Herzegovina': '🇧🇦',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Spain': '🇪🇸',
  'Portugal': '🇵🇹',
  'USA': '🇺🇸',
  'Morocco': '🇲🇦',
  'Japan': '🇯🇵',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Croatia': '🇭🇷',
  'Senegal': '🇸🇳',
  'Australia': '🇦🇺',
  'Serbia': '🇷🇸',
  'Poland': '🇵🇱',
  'Denmark': '🇩🇰',
  'Uruguay': '🇺🇾',
  'Ecuador': '🇪🇨',
  'Tunisia': '🇹🇳',
  'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Costa Rica': '🇨🇷',
  'Cameroon': '🇨🇲',
  'Ghana': '🇬🇭',
  'Colombia': '🇨🇴',
  'Venezuela': '🇻🇪',
  'Chile': '🇨🇱',
  'Peru': '🇵🇪',
  'Nigeria': '🇳🇬',
  'Egypt': '🇪🇬',
  'Algeria': '🇩🇿',
  'New Zealand': '🇳🇿',
  'Indonesia': '🇮🇩',
};