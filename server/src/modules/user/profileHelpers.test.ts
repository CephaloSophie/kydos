// Pure-logic tests for the public-profile helpers (no DB required).
import { describe, expect, it } from 'vitest';
import { eloFromPersonality, rankLabel } from './user.service.js';
import { computePlayerLevel } from '../../shared/levels.js';

describe('computePlayerLevel', () => {
  // v19 — le niveau suit désormais le modèle UNIQUE Kýdos (échelle 500, +8 %/niv.),
  // et non plus l'ancien « 1 + floor(score/100) ». Cumuls : niveau 2 à 500,
  // niveau 3 à 1040 (= 500 + 540).
  it('starts at level 1 until the first threshold (500)', () => {
    expect(computePlayerLevel(0)).toBe(1);
    expect(computePlayerLevel(499)).toBe(1);
    expect(computePlayerLevel(500)).toBe(2);
    expect(computePlayerLevel(1040)).toBe(3);
    expect(computePlayerLevel(1050)).toBe(3);
  });
  it('is safe on nullish input', () => {
    expect(computePlayerLevel(undefined as unknown as number)).toBe(1);
  });
});

describe('eloFromPersonality', () => {
  it('maps a neutral personality (all 5) to a mid ELO', () => {
    const elo = eloFromPersonality({ aggressiveness: 5, concentration: 5, velocity: 5 });
    expect(elo).toBeGreaterThan(1000);
    expect(elo).toBeLessThan(2000);
  });
  it('is monotonic — stronger traits give a higher ELO', () => {
    const weak = eloFromPersonality({ aggressiveness: 1, concentration: 1, velocity: 1 });
    const strong = eloFromPersonality({ aggressiveness: 10, concentration: 10, velocity: 10 });
    expect(strong).toBeGreaterThan(weak);
    expect(weak).toBeGreaterThanOrEqual(1000);
  });
  it('defaults missing traits to 5 (never throws)', () => {
    expect(eloFromPersonality(undefined)).toBeGreaterThanOrEqual(1000);
    expect(eloFromPersonality({})).toBeGreaterThanOrEqual(1000);
  });
});

describe('rankLabel', () => {
  it('assigns bands by level, low to high', () => {
    expect(rankLabel(1)).toBe('Débutant');
    expect(rankLabel(7)).toBe('Initié');
    expect(rankLabel(15)).toBe('Confirmé');
    expect(rankLabel(22)).toBe('Expert');
    expect(rankLabel(40)).toBe('Maître');
  });
  it('is non-decreasing across the scale', () => {
    const order = ['Débutant', 'Initié', 'Confirmé', 'Expert', 'Maître'];
    let last = -1;
    for (let lvl = 1; lvl <= 40; lvl++) {
      const idx = order.indexOf(rankLabel(lvl));
      expect(idx).toBeGreaterThanOrEqual(last);
      last = Math.max(last, idx);
    }
  });
});
