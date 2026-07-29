// @vitest-environment happy-dom
// SoundService: volume persistence + safe no-op behaviour without AudioContext
// (happy-dom has none — the service must stay inert and never throw).
import { beforeEach, describe, expect, it } from 'vitest';
import { SoundService } from './SoundService';
import { DEFAULT_MELODY_VOLUME, DEFAULT_SFX_VOLUME, STORAGE_KEYS, EFFECT_FILES, MELODY_BY_TABLE_KIND } from './soundConfig';

beforeEach(() => localStorage.clear());

describe('SoundService — volumes', () => {
  it('uses defaults when nothing is stored', () => {
    const s = new SoundService();
    expect(s.melodyVolume()).toBe(DEFAULT_MELODY_VOLUME);
    expect(s.sfxVolume()).toBe(DEFAULT_SFX_VOLUME);
  });

  it('persists volumes to localStorage and reloads them', () => {
    const s = new SoundService();
    s.setMelodyVolume(12);
    s.setSfxVolume(88);
    expect(localStorage.getItem(STORAGE_KEYS.melody)).toBe('12');
    expect(localStorage.getItem(STORAGE_KEYS.sfx)).toBe('88');
    const reloaded = new SoundService();
    expect(reloaded.melodyVolume()).toBe(12);
    expect(reloaded.sfxVolume()).toBe(88);
  });

  it('clamps out-of-range values to 0..100', () => {
    const s = new SoundService();
    s.setSfxVolume(250);
    expect(s.sfxVolume()).toBe(100);
    s.setMelodyVolume(-4);
    expect(s.melodyVolume()).toBe(0);
  });

  it('ignores corrupt stored values (falls back to defaults)', () => {
    localStorage.setItem(STORAGE_KEYS.melody, 'abc');
    expect(new SoundService().melodyVolume()).toBe(DEFAULT_MELODY_VOLUME);
  });
});

describe('SoundService — inert without AudioContext', () => {
  it('playEffect / playMelodyForTable / stopMelody / unlock never throw', () => {
    const s = new SoundService();
    expect(() => {
      s.unlock();
      s.playEffect('card-play');
      s.playMelodyForTable('royal');
      s.playMelodyForTable(null);
      s.stopMelody();
    }).not.toThrow();
  });
});

describe('soundConfig — cohérence', () => {
  it('every effect maps to a .wav filename', () => {
    for (const file of Object.values(EFFECT_FILES)) expect(file).toMatch(/\.(wav|mp3|ogg)$/);
  });
  it('every table kind melody exists and a default is defined', () => {
    expect(MELODY_BY_TABLE_KIND.default).toBeTruthy();
    for (const file of Object.values(MELODY_BY_TABLE_KIND)) expect(file).toMatch(/\.(wav|mp3|ogg)$/);
  });
});
