'use strict';

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

async function copyInviteText (code, name) {
  const text = `Rejoins mon groupe « ${name} » sur Pronostics CdM 2026 !\nCode d'accès : ${code}`;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function initPoolUI () {
  const modal = document.getElementById('pool-modal');
  const btnOpen = document.getElementById('btn-pool-selector');
  const btnClose = document.getElementById('btn-pool-close');
  const btnCreate = document.getElementById('btn-pool-create');
  const btnJoin = document.getElementById('btn-pool-join');

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
      toast('Groupe créé !', 'success');
    } catch (e) {
      toast(e.message, 'error');
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
      toast(`Bienvenue dans « ${pool.name} » !`, 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      btnJoin.disabled = false;
    }
  });
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
      </p>
      ${p.role === 'owner' ? `
        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <span class="text-[10px] text-muted">Code :</span>
          <span class="text-xs font-mono text-slate-200 bg-border px-2 py-0.5 rounded">${escHtml(p.invite_code)}</span>
          <button type="button"
                  class="btn-copy-invite text-[10px] font-semibold text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded border border-blue-800/60"
                  data-code="${escHtml(p.invite_code)}"
                  data-name="${escHtml(p.name)}">
            📋 Copier
          </button>
        </div>
      ` : ''}
    </button>
  `).join('');

  list.querySelectorAll('.btn-copy-invite').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await copyInviteText(btn.dataset.code, btn.dataset.name);
        toast('Invitation copiée !', 'success');
      } catch {
        toast('Impossible de copier', 'error');
      }
    });
  });

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
