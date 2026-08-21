import { describe, it, expect } from 'vitest';
import { isAvatarUnlocked, BUILTIN_AVATARS, mergeFaces } from './robotAvatar.service.js';

describe('isAvatarUnlocked', () => {
  it('débloqué quand level ∈ [min, max]', () => {
    expect(isAvatarUnlocked(5, 0, null)).toBe(true);
    expect(isAvatarUnlocked(5, 5, 10)).toBe(true);
    expect(isAvatarUnlocked(10, 5, 10)).toBe(true);
  });
  it('verrouillé sous le minimum', () => {
    expect(isAvatarUnlocked(3, 5, null)).toBe(false);
  });
  it('verrouillé au-dessus du maximum', () => {
    expect(isAvatarUnlocked(11, 5, 10)).toBe(false);
  });
  it('maxLevel null = pas de plafond', () => {
    expect(isAvatarUnlocked(999, 0, null)).toBe(true);
  });
});

describe('BUILTIN_AVATARS', () => {
  it('reprend les 5 presets historiques du mobile', () => {
    expect(BUILTIN_AVATARS.map((a) => a.key)).toEqual(['atne', 'bato', 'celi', 'doxa', 'eris']);
    for (const a of BUILTIN_AVATARS) expect(a.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('mergeFaces', () => {
  it('privilégie les couleurs d’un avatar personnalisé (base)', () => {
    const faces = mergeFaces(['neon'], [{ key: 'neon', accentColor: '#00ffcc', bodyColor: '#112233', outlineColor: '#001122' }]);
    expect(faces.get('neon')).toEqual({ accentColor: '#00ffcc', bodyColor: '#112233', outlineColor: '#001122' });
  });

  it('normalise bodyColor/outlineColor manquants en null', () => {
    const faces = mergeFaces(['bare'], [{ key: 'bare', accentColor: '#abcabc' }]);
    expect(faces.get('bare')).toEqual({ accentColor: '#abcabc', bodyColor: null, outlineColor: null });
  });

  it('retombe sur le preset intégré quand la clé est absente de la base', () => {
    // 'atne' est un preset intégré ; corps/contour dérivés (null) côté mascotte.
    const faces = mergeFaces(['atne'], []);
    expect(faces.get('atne')).toEqual({ accentColor: '#7ecb98', bodyColor: null, outlineColor: null });
  });

  it('ignore les clés vides/inconnues et dédoublonne', () => {
    const faces = mergeFaces(['atne', 'atne', 'nope', ''], []);
    expect(faces.has('atne')).toBe(true);
    expect(faces.has('nope')).toBe(false);
    expect(faces.has('')).toBe(false);
    expect(faces.size).toBe(1);
  });

  it('renvoie une map vide pour une liste vide', () => {
    expect(mergeFaces([], []).size).toBe(0);
  });
});
