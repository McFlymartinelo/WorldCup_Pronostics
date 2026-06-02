'use strict';

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
    toast(e.message, 'error');
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
      toast(e.message, 'error');
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
