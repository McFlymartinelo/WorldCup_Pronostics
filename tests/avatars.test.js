'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidAvatar,
  normalizeAvatar,
  imageAvatarKey,
  DEFAULT_AVATAR,
} = require('../backend/data/avatarCatalog');

describe('avatarCatalog', () => {
  it('accepte les emojis du catalogue', () => {
    assert.equal(isValidAvatar('⚽'), true);
    assert.equal(isValidAvatar('🏎️'), true);
  });

  it('accepte les avatars image whitelistés', () => {
    assert.equal(isValidAvatar('img:alpine'), true);
    assert.equal(isValidAvatar('img:alpine_orange'), true);
    assert.equal(isValidAvatar('img:alpineR'), true);
    assert.equal(isValidAvatar('img:megane3RSnoir'), true);
    assert.equal(isValidAvatar('img:megane4RSsafety'), true);
    assert.equal(isValidAvatar('img:car'), true);
    assert.equal(isValidAvatar(imageAvatarKey('moto')), true);
  });

  it('rejette les clés image inconnues et les valeurs arbitraires', () => {
    assert.equal(isValidAvatar('img:ferrari'), false);
    assert.equal(isValidAvatar('https://evil.com/x.png'), false);
    assert.equal(isValidAvatar('not-an-emoji-here'), false);
  });

  it('normalise vers le défaut si invalide', () => {
    assert.equal(normalizeAvatar('img:alpine'), 'img:alpine');
    assert.equal(normalizeAvatar('img:ALPINER'), 'img:alpineR');
    assert.equal(normalizeAvatar('img:unknown'), DEFAULT_AVATAR);
    assert.equal(normalizeAvatar(null), DEFAULT_AVATAR);
  });
});
