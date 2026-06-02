'use strict';

async function runAdminSync (btn, apiFn, label) {
  btn.disabled = true;
  btn.textContent = '⟳ En cours…';
  try {
    await apiFn();
    toast('Synchronisation terminée', 'success');
    btn.textContent = '✓ Fait';
  } catch (err) {
    toast(err.message, 'error');
    btn.textContent = `✗ Erreur`;
  }
  setTimeout(() => {
    btn.textContent = label;
    btn.disabled = false;
  }, 3000);
}

async function renderAdmin () {
  if (state.user?.role !== 'admin') return;
  const el = document.getElementById('view-admin');
  el.innerHTML = `<p class="text-muted text-sm text-center py-8">Chargement…</p>`;

  let users = []; let logs = [];
  let groupData = { groups: [], results: [], options: {} };
  try {
    [users, logs, groupData] = await Promise.all([
      API.getUsers(),
      API.getSyncLog(),
      API.getGroupResults().catch(() => ({ groups: [], results: [], options: {} })),
    ]);
  } catch (e) { el.innerHTML = `<p class="text-red-400 text-sm">${e.message}</p>`; return; }

  el.innerHTML = `
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

    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Ajouter un joueur</p>
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <div class="flex gap-2 mb-2">
        <input id="new-pseudo"   type="text"     placeholder="Pseudo"       class="input-field flex-1 text-sm" />
        <input id="new-password" type="password" placeholder="Mot de passe" class="input-field flex-1 text-sm" />
      </div>
      <button id="btn-create-user" class="w-full text-xs bg-blue-900 border border-blue-700 text-blue-300 py-2 rounded-lg hover:bg-blue-800 transition">
        + Créer le compte
      </button>
    </div>

    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Joueurs (${users.length})</p>
    <div class="bg-surface border border-border rounded-xl overflow-hidden mb-4">
      ${users.map(u => `
        <div class="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
          <span class="flex-1 text-sm ${u.role === 'admin' ? 'text-white font-semibold' : 'text-slate-300'}">${u.pseudo}</span>
          <span class="text-xs text-muted">${u.role}</span>
          ${u.role !== 'admin'
          ? `<button class="btn-reset-pwd text-xs bg-slate-800 border border-slate-600 text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-700 transition mr-1"
                       data-user-id="${u.id}" data-pseudo="${attrEsc(u.pseudo)}">MDP</button>
             <button class="btn-delete text-xs bg-red-950 border border-red-900 text-red-400 px-3 py-1 rounded-lg hover:bg-red-900 transition"
                       data-user-id="${u.id}">Supprimer</button>`
          : ''}
        </div>`).join('')}
    </div>

    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Résultats phase de groupes (paris spéciaux)</p>
    <div class="bg-surface border border-border rounded-xl p-4 mb-6">
      <p class="text-xs text-muted mb-3">Définir les 1res et 2es places par groupe (+1 pt par bonne réponse pour les joueurs).</p>
      ${!(groupData.groups || []).length
        ? '<p class="text-xs text-muted italic">Aucun groupe — synchronisez le calendrier d\'abord.</p>'
        : (groupData.groups || []).map(g => {
          const opts = groupData.options[g] || [];
          const r1 = (groupData.results || []).find(r => r.group_name === g && r.position === 1);
          const r2 = (groupData.results || []).find(r => r.group_name === g && r.position === 2);
          const label = String(g).replace(/^GROUP_/i, 'Groupe ');
          return `
            <div class="border-b border-border last:border-0 py-3 first:pt-0 last:pb-0">
              <p class="text-xs font-semibold text-slate-300 mb-2">${escHtml(label)}</p>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[10px] text-muted block mb-1">1re place (+1 pt)</label>
                  <select class="input-field admin-group-pos text-xs w-full" data-group="${attrEsc(g)}" data-position="1">
                    <option value="">—</option>
                    ${opts.map(t => `<option value="${attrEsc(t)}" ${t === (r1?.team_name || '') ? 'selected' : ''}>${escHtml(teamName(t))}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-muted block mb-1">2e place (+1 pt)</label>
                  <select class="input-field admin-group-pos text-xs w-full" data-group="${attrEsc(g)}" data-position="2">
                    <option value="">—</option>
                    ${opts.map(t => `<option value="${attrEsc(t)}" ${t === (r2?.team_name || '') ? 'selected' : ''}>${escHtml(teamName(t))}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>`;
        }).join('')}
    </div>`;

  el.querySelectorAll('.admin-group-pos').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await API.setGroupResult({
          group_name: sel.dataset.group,
          position: parseInt(sel.dataset.position, 10),
          team_name: sel.value || null,
        });
        toast('Résultat groupe enregistré', 'success');
        if (state.currentView === 'standings') renderStandings();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });

  document.getElementById('btn-sync-fixtures').addEventListener('click', (e) => {
    runAdminSync(e.target, () => API.syncFixtures(), '⟳ Calendrier');
  });
  document.getElementById('btn-sync-scores').addEventListener('click', (e) => {
    runAdminSync(e.target, () => API.syncScores(), '⟳ Scores');
  });
  document.getElementById('btn-sync-forms').addEventListener('click', (e) => {
    runAdminSync(e.target, () => API.syncForms(), '⟳ Forme des équipes');
  });
  document.getElementById('btn-sync-squads').addEventListener('click', (e) => {
    runAdminSync(e.target, () => API.syncSquads(), '⟳ Sélections');
  });

  document.getElementById('btn-create-user').addEventListener('click', async () => {
    const pseudo = document.getElementById('new-pseudo').value.trim();
    const password = document.getElementById('new-password').value;
    try {
      await API.createUser({ pseudo, password });
      toast(`${pseudo} créé !`, 'success');
      document.getElementById('new-pseudo').value = '';
      document.getElementById('new-password').value = '';
      setTimeout(() => renderAdmin(), 1200);
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  el.querySelectorAll('.btn-reset-pwd').forEach(btn => {
    btn.addEventListener('click', async () => {
      const password = prompt(`Nouveau mot de passe pour ${btn.dataset.pseudo} :`);
      if (!password) return;
      if (password.length < 4) {
        toast('Mot de passe trop court (min. 4 caractères)', 'warning');
        return;
      }
      try {
        await API.resetUserPassword(btn.dataset.userId, password);
        toast('Mot de passe réinitialisé', 'success');
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });

  el.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer ce joueur ?')) return;
      try {
        await API.deleteUser(btn.dataset.userId);
        renderAdmin();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });
}
