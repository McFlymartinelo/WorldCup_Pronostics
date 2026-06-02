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

  let users = []; let logs = []; let comp = { teams: [], scorers: [], winner_team: null, top_scorer: null };
  try {
    [users, logs, comp] = await Promise.all([
      API.getUsers(),
      API.getSyncLog(),
      API.getCompetitionResults(),
    ]);
  } catch (e) { el.innerHTML = `<p class="text-red-400 text-sm">${e.message}</p>`; return; }

  el.innerHTML = `
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
    </div>

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
    try {
      await API.setCompetitionResults({
        winner_team: document.getElementById('admin-winner').value || null,
        top_scorer: document.getElementById('admin-top-scorer').value.trim() || null,
      });
      toast('Résultats enregistrés — classement mis à jour', 'success');
      if (state.currentView === 'standings') renderStandings();
    } catch (e) {
      toast(e.message, 'error');
    }
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
