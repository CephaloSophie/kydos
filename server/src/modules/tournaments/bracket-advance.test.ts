/* =============================================================================
 * TOURNAMENTS · bracket-advance.test.ts — Scénarios E2E-like sur bracket (v14.14).
 * -----------------------------------------------------------------------------
 * Tests unitaires supplémentaires v14.14 qui complètent bracket.test :
 *   • Bracket capacity=8 complet (3 rounds : quart, demi, finale) — vérifie
 *     que les positions finales sortent correctement avec ex æquo 3ᵉ (×2)
 *     et 5ᵉ (×4).
 *   • Bracket capacity=16 complet (4 rounds) — vérifie 9ᵉ (×8).
 *   • Robustesse : lookup, propagation cohérente sur plusieurs rounds.
 * ========================================================================== */
import { describe, expect, it } from 'vitest';
import {
  buildInitialBracket,
  advanceBracket,
  computeFinalPositions,
} from './bracket.js';

function seedsFor(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    userId: `u${i + 1}`, displayName: `User ${i + 1}`,
  }));
}

describe('bracket · scénario complet capacity=8', () => {
  it('trois rounds joués → positions 1, 2, 3×2, 5×4', () => {
    const t = buildInitialBracket(8, seedsFor(8));
    expect(t.rounds).toHaveLength(3);

    // Round 1 (quart) : u1, u3, u5, u7 gagnent (slot A à chaque fois)
    for (let i = 0; i < 4; i++) {
      advanceBracket(t, { roundIndex: 1, matchIndex: i, winner: 'A', scoreA: 121, scoreB: 100, gameId: `g1-${i}` });
    }
    expect(t.lastCompletedRound).toBe(1);

    // Round 2 (demi) : u1 et u5 gagnent (slot A)
    for (let i = 0; i < 2; i++) {
      advanceBracket(t, { roundIndex: 2, matchIndex: i, winner: 'A', scoreA: 132, scoreB: 90, gameId: `g2-${i}` });
    }
    expect(t.lastCompletedRound).toBe(2);
    // Finale alimentée : u1 (A), u5 (B)
    expect(t.rounds[2].matches[0].slotA.userId).toBe('u1');
    expect(t.rounds[2].matches[0].slotB.userId).toBe('u5');

    // Finale : u1 gagne
    const r = advanceBracket(t, { roundIndex: 3, matchIndex: 0, winner: 'A', scoreA: 150, scoreB: 100, gameId: 'g3' });
    expect(r.tournamentDone).toBe(true);

    // Positions finales (capacity=8, rangs [1, 2, 3, 5])
    const pos = computeFinalPositions(t, 8);
    expect(pos.get('u1')).toBe(1);   // vainqueur
    expect(pos.get('u5')).toBe(2);   // finaliste
    expect(pos.get('u3')).toBe(3);   // demi-perdant
    expect(pos.get('u7')).toBe(3);   // demi-perdant (ex æquo)
    // 4 quart-perdants → tous rang 5
    expect(pos.get('u2')).toBe(5);
    expect(pos.get('u4')).toBe(5);
    expect(pos.get('u6')).toBe(5);
    expect(pos.get('u8')).toBe(5);
    // Aucun rang 4, 6, 7, 8 ne doit apparaître
    const ranks = new Set([...pos.values()]);
    expect(ranks).toEqual(new Set([1, 2, 3, 5]));
  });
});

describe('bracket · scénario complet capacity=16', () => {
  it('quatre rounds joués → 9 (×8) présent', () => {
    const t = buildInitialBracket(16, seedsFor(16));
    // Round 1 (8es) : slot A gagne à chaque fois → survivants u1, u3, u5, ..., u15
    for (let i = 0; i < 8; i++) {
      advanceBracket(t, { roundIndex: 1, matchIndex: i, winner: 'A', scoreA: 120, scoreB: 80, gameId: `g1-${i}` });
    }
    // Round 2 (quart) : slot A gagne
    for (let i = 0; i < 4; i++) {
      advanceBracket(t, { roundIndex: 2, matchIndex: i, winner: 'A', scoreA: 130, scoreB: 90, gameId: `g2-${i}` });
    }
    // Round 3 (demi) : slot A gagne
    for (let i = 0; i < 2; i++) {
      advanceBracket(t, { roundIndex: 3, matchIndex: i, winner: 'A', scoreA: 140, scoreB: 100, gameId: `g3-${i}` });
    }
    // Finale : slot A (u1) gagne
    advanceBracket(t, { roundIndex: 4, matchIndex: 0, winner: 'A', scoreA: 150, scoreB: 110, gameId: 'g-final' });

    const pos = computeFinalPositions(t, 16);
    // Rangs attendus : [1, 2, 3, 5, 9]
    const ranks = new Set([...pos.values()]);
    expect(ranks).toEqual(new Set([1, 2, 3, 5, 9]));

    // Compter les occupants
    const counts: Record<number, number> = {};
    for (const r of pos.values()) counts[r] = (counts[r] ?? 0) + 1;
    expect(counts[1]).toBe(1);
    expect(counts[2]).toBe(1);
    expect(counts[3]).toBe(2);
    expect(counts[5]).toBe(4);
    expect(counts[9]).toBe(8);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(16);
  });
});

describe('bracket · idempotence rejouée sur 3 rounds', () => {
  it('rejouer les mêmes fins ne change rien', () => {
    const t = buildInitialBracket(4, seedsFor(4));
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 121, scoreB: 90, gameId: 'g1' });
    advanceBracket(t, { roundIndex: 1, matchIndex: 1, winner: 'B', scoreA: 90, scoreB: 121, gameId: 'g2' });
    advanceBracket(t, { roundIndex: 2, matchIndex: 0, winner: 'A', scoreA: 130, scoreB: 100, gameId: 'g3' });
    const snapshot = JSON.stringify(t);

    // Rejouer chaque fin — ne doit rien muter
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 121, scoreB: 90, gameId: 'g1' });
    advanceBracket(t, { roundIndex: 1, matchIndex: 1, winner: 'B', scoreA: 90, scoreB: 121, gameId: 'g2' });
    advanceBracket(t, { roundIndex: 2, matchIndex: 0, winner: 'A', scoreA: 130, scoreB: 100, gameId: 'g3' });

    expect(JSON.stringify(t)).toBe(snapshot);
  });
});

describe('bracket · v17 manches gagnées (score de progression monotone)', () => {
  it('advanceBracket persiste manchesA/manchesB quand fournis', () => {
    const t = buildInitialBracket(4, seedsFor(4));
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 121, scoreB: 90, manchesA: 2, manchesB: 1, gameId: 'g1' });
    const bm = t.rounds[0].matches[0];
    expect(bm.manchesA).toBe(2);
    expect(bm.manchesB).toBe(1);
    // Les points restent disponibles en secondaire.
    expect(bm.scoreA).toBe(121);
  });

  it('manchesA/manchesB par défaut à null tant que non renseignés', () => {
    const t = buildInitialBracket(4, seedsFor(4));
    expect(t.rounds[0].matches[0].manchesA).toBeNull();
    expect(t.rounds[0].matches[0].manchesB).toBeNull();
    // advanceBracket sans manches ne les invente pas.
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 121, scoreB: 90, gameId: 'g1' });
    expect(t.rounds[0].matches[0].manchesA).toBeNull();
  });
});
