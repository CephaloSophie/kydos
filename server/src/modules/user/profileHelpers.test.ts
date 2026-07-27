// Pure-logic tests for the public-profile helpers (no DB required).
import { describe, expect, it } from 'vitest';
import { eloFromPersonality, rankLabel } from './user.service.js';
import { computePlayerLevel } from '../../shared/levels.js';

describe('computePlayerLevel', () => {
  it('starts at level 1 and gains one level per 100 points', () => {
    expect(computePlayerLevel(0)).toBe(1);
    expect(computePlayerLevel(99)).toBe(1);
    expect(computePlayerLevel(100)).toBe(2);
    expect(computePlayerLevel(1050)).toBe(11);
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
