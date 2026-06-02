'use strict';

const DEFAULT_AVATAR = '⚽';

const EMOJI_AVATARS = [
  '⚽', '🏆', '🥅', '🎯', '🔥', '⚡', '💥', '🌟', '👑', '🦁',
  '🐯', '🦊', '🐺', '🦅', '🦋', '🌈', '🎭', '🎪', '🚀', '💎',
  '🍕', '🌮', '🎸', '🎺', '🥁', '🏄', '🤿', '🧗', '🏇', '🤺',
  '🚗', '🏎️', '🏁', '🛞',
  '🇫🇷', '🇧🇷', '🇩🇪', '🇪🇸', '🇵🇹', '🇦🇷', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇳🇱', '🇲🇦', '🇯🇵',
];

const IMAGE_AVATARS = {
  alpine:        { label: 'Alpine', file: 'alpine.jpg' },
  alpine_orange: { label: 'Alpine orange', file: 'alpine_orange.jpg' },
  alpineR:         { label: 'Alpine A110 R', file: 'alpineR.jpg' },
  megane3RSnoir:   { label: 'Mégane 3 RS', file: 'megane3RSnoir.jpg' },
  megane4RSsafety: { label: 'Mégane 4 RS Safety', file: 'megane4RSsafety.jpg' },
  car:             { label: 'Voiture', file: 'car.svg' },
  race:          { label: 'Course', file: 'race.svg' },
  moto:          { label: 'Moto', file: 'moto.svg' },
};

function imageAvatarKey (id) {
  return `img:${id}`;
}

function isImageAvatar (avatar) {
  return typeof avatar === 'string' && avatar.startsWith('img:');
}

function parseImageId (avatar) {
  if (!isImageAvatar(avatar)) return null;
  return avatar.slice(4);
}

function canonicalImageId (id) {
  if (!id) return null;
  if (Object.prototype.hasOwnProperty.call(IMAGE_AVATARS, id)) return id;
  const found = Object.keys(IMAGE_AVATARS).find(k => k.toLowerCase() === id.toLowerCase());
  return found || null;
}

function canonicalAvatar (avatar) {
  if (!avatar || typeof avatar !== 'string') return DEFAULT_AVATAR;
  if (EMOJI_AVATARS.includes(avatar)) return avatar;
  if (isImageAvatar(avatar)) {
    const id = canonicalImageId(parseImageId(avatar));
    return id ? imageAvatarKey(id) : DEFAULT_AVATAR;
  }
  return DEFAULT_AVATAR;
}

function isValidAvatar (avatar) {
  if (!avatar || typeof avatar !== 'string') return false;
  if (EMOJI_AVATARS.includes(avatar)) return true;
  if (isImageAvatar(avatar)) {
    return Boolean(canonicalImageId(parseImageId(avatar)));
  }
  return false;
}

function normalizeAvatar (avatar) {
  if (!avatar) return DEFAULT_AVATAR;
  return isValidAvatar(avatar) ? canonicalAvatar(avatar) : DEFAULT_AVATAR;
}

function allAvatarKeys () {
  return [
    ...EMOJI_AVATARS,
    ...Object.keys(IMAGE_AVATARS).map(imageAvatarKey),
  ];
}

module.exports = {
  DEFAULT_AVATAR,
  EMOJI_AVATARS,
  IMAGE_AVATARS,
  imageAvatarKey,
  isImageAvatar,
  parseImageId,
  isValidAvatar,
  canonicalAvatar,
  normalizeAvatar,
  allAvatarKeys,
};
