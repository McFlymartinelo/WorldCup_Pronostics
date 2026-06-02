'use strict';

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

  const locked = !!profile.picks_locked;
  const teams = profile.teams || [];
  const scorers = profile.scorers || [];

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
      <div>
        <p class="font-semibold text-white text-lg">${profile.pseudo}</p>
        <p class="text-xs text-muted">${profile.role}</p>
      </div>
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

  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-profile');
    btn.disabled = true;
    try {
      const pickWinner = document.getElementById('pick-winner')?.value || null;
      const pickScorer = document.getElementById('pick-top-scorer')?.value.trim() || null;

      await API.updateProfile({
        avatar: selectedAvatar,
        color: selectedColor,
        ...(!locked ? { pick_winner: pickWinner, pick_top_scorer: pickScorer } : {}),
      });
      state.user.avatar = selectedAvatar;
      state.user.color = selectedColor;

      const row = state.standings.find(u => u.pseudo === state.user.pseudo);
      if (row) {
        row.avatar = selectedAvatar;
        row.color = selectedColor;
      }
      if (state.currentView === 'standings') renderStandings();

      document.getElementById('header-pseudo').innerHTML = `
        <span style="font-size:14px">${selectedAvatar}</span>
        <span>${state.user.pseudo}</span>`;

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
