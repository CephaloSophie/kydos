// Tests unitaires : rentabilité (economics) + logique de bracket.
import { describe, it, expect } from 'vitest';
import { tournamentEconomics, survivorsAtRound } from './economics.js';
import { roundCount, pairForRound, survivorsAtStartOfRound, isBracketFinished, type BracketSlot } from './bracket.js';

describe('economics — cas de la spec Ameur', () => {
  it('16 participants, 1000 buy-in, gains 300/400/500/1500 → houseNet correct', () => {
    // Spec: 16 participants (donc départs 1/8 = round 1) → 8 survivants au round 2,
    // 4 au round 3, 2 au round 4 (finale).
    const r = tournamentEconomics({
      capacity: 16,
      entryFee: 1000,
      rounds: [
        { round: 1, prize: 0 },      // pas de gain au round 1 (élimination directe)
        { round: 2, prize: 300 },    // 8 survivants gagnent 300
        { round: 3, prize: 400 },    // 4 survivants gagnent 400
        { round: 4, prize: 500 },    // 2 finalistes gagnent 500
        { round: 5, prize: 1500 },   // 1 vainqueur gagne 1500
      ],
    });
    // capacity=16, entry=1000 → collected=16000
    // paid = 0 + 8*300 + 4*400 + 2*500 + 1*1500 = 2400 + 1600 + 1000 + 1500 = 6500
    // houseNet = 16000 - 6500 = 9500
    expect(r.totalCollected).toBe(16_000);
    expect(r.totalPaid).toBe(6_500);
    expect(r.houseNet).toBe(9_500);
  });

  it('houseNet peut être négatif (tournoi mal calibré)', () => {
    const r = tournamentEconomics({
      capacity: 8,
      entryFee: 100,
      rounds: [{ round: 1, prize: 500 }],  // 8 * 500 = 4000 payés, 800 collectés
    });
    expect(r.houseNet).toBeLessThan(0);
  });

  it('survivorsAtRound respecte la division par 2', () => {
    expect(survivorsAtRound(16, 1)).toBe(16);
    expect(survivorsAtRound(16, 2)).toBe(8);
    expect(survivorsAtRound(16, 3)).toBe(4);
    expect(survivorsAtRound(16, 4)).toBe(2);
    expect(survivorsAtRound(16, 5)).toBe(1);
  });
});

describe('bracket — appariement et progression', () => {
  const mkSlots = (n: number): BracketSlot[] =>
    Array.from({ length: n }, (_, i) => ({ seedIndex: i, userId: `u${i}`, robotIds: [], eliminatedAtRound: null }));

  it('roundCount log2 capacity', () => {
    expect(roundCount(4)).toBe(2);
    expect(roundCount(16)).toBe(4);
    expect(roundCount(128)).toBe(7);
  });

  it('pairForRound apparie 2 par 2 pour DUO/HYBRID', () => {
    const pairs = pairForRound(mkSlots(4), 2);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].map((s) => s.userId)).toEqual(['u0', 'u1']);
    expect(pairs[1].map((s) => s.userId)).toEqual(['u2', 'u3']);
  });

  it('pairForRound apparie 4 par 4 pour ROYAL', () => {
    const pairs = pairForRound(mkSlots(8), 4);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toHaveLength(4);
  });

  it('survivorsAtStartOfRound exclut les éliminés antérieurs', () => {
    const slots = mkSlots(4);
    slots[0].eliminatedAtRound = 1;
    slots[1].eliminatedAtRound = 2;
    expect(survivorsAtStartOfRound(slots, 2).map((s) => s.userId)).toEqual(['u1', 'u2', 'u3']);
    expect(survivorsAtStartOfRound(slots, 3).map((s) => s.userId)).toEqual(['u2', 'u3']);
  });

  it('isBracketFinished — 1 survivant en 1v1', () => {
    const slots = mkSlots(4);
    slots[0].eliminatedAtRound = 1;
    slots[1].eliminatedAtRound = 1;
    slots[2].eliminatedAtRound = 2;
    expect(isBracketFinished(slots, 2)).toBe(true);
  });
});
