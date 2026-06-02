'use strict';

function groupDisplayLabel (groupName) {
  return `Groupe ${String(groupName).replace(/^GROUP_/i, '')}`;
}

function specialPickKey (groupName, position) {
  return position === 1 ? `${groupName}_1ST` : `${groupName}_2ND`;
}

function syncPseudoInUI (updated, avatar) {
  state.user.pseudo = updated.pseudo;
  state.user.id = updated.id;
  const row = state.standings.find(u => u.id === updated.id);
  if (row) row.pseudo = updated.pseudo;
  if (state.currentView === 'standings') renderStandings();
  const header = document.getElementById('header-pseudo');
  if (header) {
    header.innerHTML = `
      <span style="font-size:14px">${avatar || state.user.avatar || '⚽'}</span>
      <span>${escHtml(updated.pseudo)}</span>`;
  }
}

function bindProfilePseudoEdit (container, initialPseudo, avatar) {
  const btn = container.querySelector('#profile-pseudo-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (container.querySelector('#profile-pseudo-input')) return;

    const original = btn.textContent.trim();
    const input = document.createElement('input');
    input.id = 'profile-pseudo-input';
    input.type = 'text';
    input.maxLength = 20;
    input.value = original;
    input.dataset.originalPseudo = original;
    input.className = 'input-field text-lg font-semibold w-full';
    input.autocomplete = 'off';
    btn.replaceWith(input);
    input.focus();
    input.select();

    let saving = false;

    const restoreBtn = (text) => {
      if (!container.contains(input)) return;
      input.replaceWith(btn);
      btn.textContent = text;
    };

    const finish = async () => {
      if (saving || !container.contains(input)) return;

      const newPseudo = input.value.trim();
      if (newPseudo === original) {
        restoreBtn(original);
        return;
      }
      if (newPseudo.length < 2 || newPseudo.length > 20) {
        toast('Pseudo : 2 à 20 caractères', 'warning');
        input.focus();
        return;
      }

      saving = true;
      input.disabled = true;
      try {
        const updated = await API.updateProfile({ pseudo: newPseudo });
        syncPseudoInUI(updated, avatar);
        restoreBtn(updated.pseudo);
        toast('Pseudo mis à jour', 'success');
      } catch (e) {
        saving = false;
        input.disabled = false;
        toast(e.message, 'error');
        input.focus();
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (saving) return;
        restoreBtn(original);
      }
    });
    input.addEventListener('blur', (e) => {
      if (e.relatedTarget?.id === 'btn-save-profile') return;
      window.setTimeout(() => {
        if (container.contains(input) && document.activeElement !== input) {
          finish();
        }
      }, 0);
    });
  });
}

function readOpenPseudoEdit () {
  const input = document.getElementById('profile-pseudo-input');
  if (!input) return null;
  const trimmed = input.value.trim();
  const current = (input.dataset.originalPseudo || state.user.pseudo || '').trim();
  if (!trimmed || trimmed === current) return null;
  if (trimmed.length < 2 || trimmed.length > 20) {
    throw new Error('Pseudo : 2 à 20 caractères');
  }
  return trimmed;
}

async function renderProfile () {
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

  state.user.pseudo = profile.pseudo;
  state.user.id = profile.id;

  const locked = !!profile.picks_locked;
  const teams = profile.teams || [];
  const scorers = profile.scorers || [];
  const groupOptions = profile.group_options || {};
  const specialPicks = profile.special_picks || {};
  const badges = profile.badges || [];
  const groupLocks = profile.group_locks || {};
  const groupNames = Object.keys(groupOptions).sort((a, b) => a.localeCompare(b, 'fr'));

  const AVATARS = [
    '⚽', '🏆', '🥅', '🎯', '🔥', '⚡', '💥', '🌟', '👑', '🦁',
    '🐯', '🦊', '🐺', '🦅', '🦋', '🌈', '🎭', '🎪', '🚀', '💎',
    '🍕', '🌮', '🎸', '🎺', '🥁', '🏄', '🤿', '🧗', '🏇', '🤺',
    '🇫🇷', '🇧🇷', '🇩🇪', '🇪🇸', '🇵🇹', '🇦🇷', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇳🇱', '🇲🇦', '🇯🇵',
  ];

  const COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#64748b',
  ];

  el.innerHTML = `
    <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Mon profil</p>

    <div class="bg-surface border border-border rounded-xl p-4 mb-4 flex items-center gap-4">
      <div class="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
           id="preview-avatar-bg"
           style="background: ${profile.color}22; border: 2px solid ${profile.color}">
        <span id="preview-avatar">${profile.avatar || '⚽'}</span>
      </div>
      <div class="flex-1 min-w-0">
        <button type="button" id="profile-pseudo-btn"
                class="profile-pseudo-btn font-semibold text-white text-lg truncate text-left hover:text-blue-300 transition"
                title="Cliquer pour modifier le pseudo">
          ${escHtml(profile.pseudo)}
        </button>
        <p class="text-[10px] text-muted mt-0.5">Clique sur ton pseudo pour le modifier</p>
        <p class="text-xs text-muted">${profile.role}</p>
        ${profile.bonus_special
        ? `<p class="text-xs text-pink-400 mt-1">🎲 Paris spéciaux : +${profile.bonus_special} pts</p>`
        : ''}
      </div>
    </div>

    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Badges</p>
      ${badges.length
        ? `<div class="flex flex-wrap gap-2">${badges.map(b => `
            <span class="profile-badge" title="${escHtml(b.label)}">${b.emoji} ${escHtml(b.label)}</span>
          `).join('')}</div>`
        : '<p class="text-xs text-muted">Jouez quelques matchs pour débloquer des badges automatiques.</p>'}
    </div>

    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Partager le classement</p>
      <p class="text-xs text-muted mb-3">Copie un résumé texte du classement du groupe actuel.</p>
      <button id="btn-export-standings" type="button"
              class="w-full text-xs bg-slate-800 border border-slate-600 text-slate-200 py-2 rounded-lg hover:bg-slate-700 transition">
        📋 Copier le classement
      </button>
    </div>

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
      <div class="flex items-center gap-3 mt-3">
        <input type="color" id="custom-color" value="${profile.color || '#3b82f6'}"
               class="w-8 h-8 rounded cursor-pointer border-0 bg-transparent">
        <span class="text-xs text-muted">Couleur personnalisée</span>
      </div>
    </div>

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
          <option value="${attrEsc(t)}" ${t === (profile.pick_winner || '') ? 'selected' : ''}>${escHtml(teamName(t))}</option>
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

    ${groupNames.length ? `
    <div class="bg-surface border border-border rounded-xl p-4 mb-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Paris spéciaux</p>
      <p class="text-xs text-muted mb-3">1re et 2e place par groupe — +1 pt par bonne réponse. Verrouillé dès le premier match du groupe.</p>
      <div class="space-y-4">
        ${groupNames.map(g => {
          const opts = groupOptions[g] || [];
          const groupLocked = !!groupLocks[g];
          const val1 = specialPicks[specialPickKey(g, 1)] || '';
          const val2 = specialPicks[specialPickKey(g, 2)] || '';
          return `
            <div class="border-b border-border last:border-0 pb-3 last:pb-0">
              <p class="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
                ${groupDisplayLabel(g)}
                ${groupLocked ? '<span class="text-amber-400/90 text-[10px] font-normal">🔒 verrouillé</span>' : ''}
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] text-muted mb-1">1re place (+1 pt)</label>
                  <select class="input-field special-pick-select w-full text-sm" data-group="${attrEsc(g)}" data-position="1" ${groupLocked ? 'disabled' : ''}>
                    <option value="">— Choisir —</option>
                    ${opts.map(t => `
                      <option value="${attrEsc(t)}" ${t === val1 ? 'selected' : ''}>${escHtml(teamName(t))}</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] text-muted mb-1">2e place (+1 pt)</label>
                  <select class="input-field special-pick-select w-full text-sm" data-group="${attrEsc(g)}" data-position="2" ${groupLocked ? 'disabled' : ''}>
                    <option value="">— Choisir —</option>
                    ${opts.map(t => `
                      <option value="${attrEsc(t)}" ${t === val2 ? 'selected' : ''}>${escHtml(teamName(t))}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <button id="btn-save-profile"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition">
      ✓ Sauvegarder
    </button>`;

  let selectedAvatar = profile.avatar || '⚽';
  let selectedColor = profile.color || '#3b82f6';

  el.querySelectorAll('.avatar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAvatar = btn.dataset.avatar;
      el.querySelectorAll('.avatar-btn').forEach(b =>
        b.className = b.className.replace(' bg-white/20 ring-1 ring-white/40', ''),
      );
      btn.className += ' bg-white/20 ring-1 ring-white/40';
      document.getElementById('preview-avatar').textContent = selectedAvatar;
    });
  });

  el.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      el.querySelectorAll('.color-btn').forEach(b =>
        b.className = b.className.replace(' ring-2 ring-white ring-offset-2 ring-offset-bg scale-110', ''),
      );
      btn.className += ' ring-2 ring-white ring-offset-2 ring-offset-bg scale-110';
      document.getElementById('custom-color').value = selectedColor;
      updatePreviewColor(selectedColor);
    });
  });

  document.getElementById('custom-color').addEventListener('input', (e) => {
    selectedColor = e.target.value;
    updatePreviewColor(selectedColor);
  });

  bindProfilePseudoEdit(el, profile.pseudo, profile.avatar || '⚽');

  document.getElementById('btn-export-standings')?.addEventListener('click', async () => {
    try {
      const { text } = await API.exportStandings();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast('Classement copié dans le presse-papier', 'success');
      } else {
        prompt('Copiez le classement :', text);
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-profile');
    btn.disabled = true;
    try {
      const pickWinner = document.getElementById('pick-winner')?.value || null;
      const pickScorer = document.getElementById('pick-top-scorer')?.value.trim() || null;
      let pseudoUpdate = null;
      try {
        pseudoUpdate = readOpenPseudoEdit();
      } catch (pseudoErr) {
        toast(pseudoErr.message, 'warning');
        btn.disabled = false;
        return;
      }

      const special_picks = {};
      el.querySelectorAll('.special-pick-select:not([disabled])').forEach(sel => {
        const g = sel.dataset.group;
        const pos = parseInt(sel.dataset.position, 10);
        if (g && pos) special_picks[specialPickKey(g, pos)] = sel.value || null;
      });

      const updated = await API.updateProfile({
        ...(pseudoUpdate ? { pseudo: pseudoUpdate } : {}),
        avatar: selectedAvatar,
        color: selectedColor,
        ...(!locked ? {
          pick_winner: pickWinner,
          pick_top_scorer: pickScorer,
        } : {}),
        ...(groupNames.length ? { special_picks } : {}),
      });

      if (pseudoUpdate) {
        syncPseudoInUI(updated, selectedAvatar);
        const input = document.getElementById('profile-pseudo-input');
        if (input) {
          const newBtn = document.createElement('button');
          newBtn.type = 'button';
          newBtn.id = 'profile-pseudo-btn';
          newBtn.className = 'profile-pseudo-btn font-semibold text-white text-lg truncate text-left hover:text-blue-300 transition';
          newBtn.title = 'Cliquer pour modifier le pseudo';
          newBtn.textContent = updated.pseudo;
          input.replaceWith(newBtn);
          bindProfilePseudoEdit(el, updated.pseudo, selectedAvatar);
        }
      }

      state.user.avatar = selectedAvatar;
      state.user.color = selectedColor;

      const row = state.standings.find(u => u.id === (state.user.id || profile.id));
      if (row) {
        row.avatar = selectedAvatar;
        row.color = selectedColor;
      }
      if (state.currentView === 'standings') renderStandings();

      document.getElementById('header-pseudo').innerHTML = `
        <span style="font-size:14px">${selectedAvatar}</span>
        <span>${escHtml(state.user.pseudo)}</span>`;

      toast('Profil sauvegardé', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  function updatePreviewColor (color) {
    const bg = document.getElementById('preview-avatar-bg');
    bg.style.background = `${color}22`;
    bg.style.borderColor = color;
  }
}
