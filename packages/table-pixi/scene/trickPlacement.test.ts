import { describe, expect, it } from 'vitest';
import { hashUnit, placeTrickCard, BASE_ROTATION } from './trickPlacement';

describe('trickPlacement — placement des cartes jouées', () => {
  const CARD_W = 68, CARD_H = 96;
  const maxOff = Math.max(CARD_W, CARD_H) * 0.4;

  it('hashUnit est déterministe et borné dans [0,1[', () => {
    for (const seed of ['2:Vpique', '0:As coeur', '3:10 trefle']) {
      const a = hashUnit(seed, 1), b = hashUnit(seed, 1);
      expect(a).toBe(b);                 // déterministe
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1);
    }
    // Des sels différents donnent (en général) des valeurs différentes.
    expect(hashUnit('x', 1)).not.toBe(hashUnit('x', 2));
  });

  it('le décalage garde le centre de la carte à ≤ 40% de sa taille', () => {
    for (let s = 0; s < 200; s++) {
      const p = placeTrickCard(`k${s}:Vpique`, s % 4, CARD_W, CARD_H);
      expect(Math.abs(p.dx)).toBeLessThanOrEqual(maxOff + 1e-9);
      expect(Math.abs(p.dy)).toBeLessThanOrEqual(maxOff + 1e-9);
    }
  });

  it('l’inclinaison reste dans base ±30° (perpendiculaire au joueur)', () => {
    const LIMIT = Math.PI / 6 + 1e-9; // 30°
    for (let s = 0; s < 200; s++) {
      const rel = s % 4;
      const p = placeTrickCard(`c${s}:As coeur`, rel, CARD_W, CARD_H);
      const delta = p.rot - BASE_ROTATION[rel];
      expect(Math.abs(delta)).toBeLessThanOrEqual(LIMIT);
    }
  });

  it('le placement est stable pour une même carte (rejeu identique)', () => {
    const a = placeTrickCard('2:Rcarreau', 1, CARD_W, CARD_H);
    const b = placeTrickCard('2:Rcarreau', 1, CARD_W, CARD_H);
    expect(a).toEqual(b);
  });
});
