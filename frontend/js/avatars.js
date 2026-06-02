'use strict';

/** Garder synchronisé avec backend/data/avatarCatalog.js */
const DEFAULT_AVATAR = '⚽';
const AVATAR_ASSETS_BASE = 'assets/avatars/';

const EMOJI_AVATARS = [
  '⚽', '🏆', '🥅', '🎯', '🔥', '⚡', '💥', '🌟', '👑', '🦁',
  '🐯', '🦊', '🐺', '🦅', '🦋', '🌈', '🎭', '🎪', '🚀', '💎',
  '🍕', '🌮', '🎸', '🎺', '🥁', '🏄', '🤿', '🧗', '🏇', '🤺',
  '🚗', '🏎️', '🏁', '🛞',
  '🇫🇷', '🇧🇷', '🇩🇪', '🇪🇸', '🇵🇹', '🇦🇷', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇳🇱', '🇲🇦', '🇯🇵',
];

const IMAGE_AVATAR_CATALOG = {
  alpine:        { label: 'Alpine', file: 'alpine.jpg' },
  alpine_orange: { label: 'Alpine orange', file: 'alpine_orange.jpg' },
  alpineR:         { label: 'Alpine A110 R', file: 'alpineR.jpg' },
  megane3RSnoir:   { label: 'Mégane 3 RS', file: 'megane3RSnoir.jpg' },
  megane4RSsafety: { label: 'Mégane 4 RS Safety', file: 'megane4RSsafety.jpg' },
  car:             { label: 'Voiture', file: 'car.svg' },
  race:          { label: 'Course', file: 'race.svg' },
  moto:          { label: 'Moto', file: 'moto.svg' },
};

const IMAGE_AVATAR_KEYS = Object.keys(IMAGE_AVATAR_CATALOG).map(id => `img:${id}`);

function isImageAvatarKey (avatar) {
  return typeof avatar === 'string' && avatar.startsWith('img:');
}

function imageAvatarSrc (avatar) {
  if (!isImageAvatarKey(avatar)) return null;
  const meta = IMAGE_AVATAR_CATALOG[avatar.slice(4)];
  return meta ? `${AVATAR_ASSETS_BASE}${meta.file}` : null;
}

function avatarHtml (avatar, { size = 'md', className = '', alt = 'Avatar' } = {}) {
  const a = avatar || DEFAULT_AVATAR;
  const src = imageAvatarSrc(a);
  const sizeClass = size === 'xs' ? 'avatar-img-xs'
    : size === 'sm' ? 'avatar-img-sm'
      : size === 'lg' ? 'avatar-img-lg'
        : size === 'xl' ? 'avatar-img-xl'
          : size === 'grid' ? 'avatar-img-grid'
            : 'avatar-img-md';

  if (src) {
    const meta = IMAGE_AVATAR_CATALOG[a.slice(4)];
    return `<img src="${attrEsc(src)}" alt="${attrEsc(meta?.label || alt)}" class="avatar-img ${sizeClass}${className ? ` ${className}` : ''}" draggable="false">`;
  }
  return `<span class="avatar-emoji${className ? ` ${className}` : ''}">${escHtml(a)}</span>`;
}

function setAvatarElement (el, avatar) {
  if (!el) return;
  el.innerHTML = avatarHtml(avatar, { size: 'lg' });
}

function avatarPickerBtnHtml (avatar, selected) {
  const selectedCls = selected ? ' bg-white/20 ring-1 ring-white/40' : '';
  const inner = isImageAvatarKey(avatar)
    ? avatarHtml(avatar, { size: 'grid', className: 'avatar-picker-img' })
    : avatar;
  return `
    <button type="button" class="avatar-btn text-xl p-1.5 rounded-lg transition hover:bg-white/10${selectedCls}"
            data-avatar="${attrEsc(avatar)}" title="${attrEsc(isImageAvatarKey(avatar) ? IMAGE_AVATAR_CATALOG[avatar.slice(4)]?.label || avatar : avatar)}">
      ${inner}
    </button>`;
}
