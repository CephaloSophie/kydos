import { describe, it, expect } from 'vitest';
import { isAvatarUnlocked, BUILTIN_AVATARS } from './robotAvatar.service.js';

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
