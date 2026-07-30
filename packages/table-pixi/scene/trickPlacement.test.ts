import { describe, expect, it } from 'vitest';
import { hashUnit, placeTrickCard, BASE_ROTATION, SEAT_DIRECTION } from './trickPlacement';

describe('trickPlacement — placement par secteur (valeurs jamais cachées)', () => {
  const CARD_W = 68, CARD_H = 96;
  const size = Math.max(CARD_W, CARD_H);

  it('hashUnit est déterministe et borné dans [0,1[', () => {
    for (const seed of ['2:Vpique', '0:As coeur', '3:10 trefle']) {
      expect(hashUnit(seed, 1)).toBe(hashUnit(seed, 1));
      expect(hashUnit(seed, 1)).toBeGreaterThanOrEqual(0);
      expect(hashUnit(seed, 1)).toBeLessThan(1);
    }
    expect(hashUnit('x', 1)).not.toBe(hashUnit('x', 2));
  });

  it('chaque carte est décalée VERS son siège (secteur dédié)', () => {
    // bas → dy>0, haut → dy<0, gauche → dx<0, droite → dx>0 (le décalage
    // directionnel domine le petit jitter perpendiculaire).
    const bas = placeTrickCard('k:bas', 0, CARD_W, CARD_H);
    const haut = placeTrickCard('k:haut', 2, CARD_W, CARD_H);
    const gauche = placeTrickCard('k:gauche', 1, CARD_W, CARD_H);
    const droite = placeTrickCard('k:droite', 3, CARD_W, CARD_H);
    expect(bas.dy).toBeGreaterThan(0);
    expect(haut.dy).toBeLessThan(0);
    expect(gauche.dx).toBeLessThan(0);
    expect(droite.dx).toBeGreaterThan(0);
  });

  it('le décalage total reste borné (jamais éjecté du centre)', () => {
    for (let s = 0; s < 200; s++) {
      const p = placeTrickCard(`k${s}:Vpique`, s % 4, CARD_W, CARD_H);
      const dist = Math.hypot(p.dx, p.dy);
      // along (0.34) + perp (≤0.1) ⇒ borne large 0.5×taille.
      expect(dist).toBeLessThanOrEqual(size * 0.5 + 1e-6);
    }
  });

  it('deux cartes de sièges OPPOSÉS partent dans des directions opposées', () => {
    const bas = placeTrickCard('a', 0, CARD_W, CARD_H);
    const haut = placeTrickCard('a', 2, CARD_W, CARD_H);
    // Produit scalaire des offsets directionnels < 0 (opposés).
    expect(bas.dx * haut.dx + bas.dy * haut.dy).toBeLessThan(0);
  });

  it('l’inclinaison reste dans base ±15° (coins non enfouis)', () => {
    const LIMIT = Math.PI / 13 + 1e-9;
    for (let s = 0; s < 200; s++) {
      const rel = s % 4;
      const p = placeTrickCard(`c${s}:As`, rel, CARD_W, CARD_H);
      expect(Math.abs(p.rot - BASE_ROTATION[rel])).toBeLessThanOrEqual(LIMIT);
    }
  });

  it('le placement est stable pour une même carte (rejeu identique)', () => {
    expect(placeTrickCard('2:Rcarreau', 1, CARD_W, CARD_H)).toEqual(placeTrickCard('2:Rcarreau', 1, CARD_W, CARD_H));
  });

  it('SEAT_DIRECTION couvre les 4 sièges', () => {
    expect(SEAT_DIRECTION).toHaveLength(4);
  });
});
