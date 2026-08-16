/* =============================================================================
 * TOURNAMENTS · tournament.test.ts — Tests unitaires des fonctions pures (v14.12).
 * -----------------------------------------------------------------------------
 * Couvre les concepts critiques du bracket : positions finales avec ex æquo,
 * construction initiale, avance incrémentale, calcul des rangs à la fin.
 * Aucune I/O — ces tests garantissent la correction algorithmique du bracket.
 * ========================================================================== */
import { describe, expect, it } from 'vitest';
import {
  roundCountForCapacity,
  labelForRound,
  computePositions,
  occupantsPerPosition,
  positionForLoserAtRound,
  buildInitialBracket,
  advanceBracket,
  computeFinalPositions,
  findBracketMatchByMatchId,
} from './bracket.js';
import { tournamentEconomicsByPosition, occupantsAtPosition } from './economics.js';

describe('bracket · positions & ex æquo', () => {
  it('roundCountForCapacity — log2(capacity)', () => {
    expect(roundCountForCapacity(4)).toBe(2);
    expect(roundCountForCapacity(8)).toBe(3);
    expect(roundCountForCapacity(16)).toBe(4);
    expect(roundCountForCapacity(128)).toBe(7);
  });

  it('labelForRound — labels humains cohérents', () => {
    expect(labelForRound(4, 2)).toBe('Finale');
    expect(labelForRound(4, 1)).toBe('Demi-finale');
    expect(labelForRound(16, 4)).toBe('Finale');
    expect(labelForRound(16, 3)).toBe('Demi-finale');
    expect(labelForRound(16, 2)).toBe('Quart de finale');
    expect(labelForRound(16, 1)).toBe('8es de finale');
    expect(labelForRound(32, 1)).toBe('16es de finale');
  });

  it('computePositions — rangs uniques par capacité', () => {
    expect(computePositions(4)).toEqual([1, 2, 3]);
    expect(computePositions(8)).toEqual([1, 2, 3, 5]);
    expect(computePositions(16)).toEqual([1, 2, 3, 5, 9]);
    expect(computePositions(32)).toEqual([1, 2, 3, 5, 9, 17]);
    expect(computePositions(64)).toEqual([1, 2, 3, 5, 9, 17, 33]);
    expect(computePositions(128)).toEqual([1, 2, 3, 5, 9, 17, 33, 65]);
  });

  it('occupantsPerPosition — nb ex æquo par rang', () => {
    expect(occupantsPerPosition(16)).toEqual({ 1: 1, 2: 1, 3: 2, 5: 4, 9: 8 });
    expect(occupantsPerPosition(4)).toEqual({ 1: 1, 2: 1, 3: 2 });
  });

  it('positionForLoserAtRound — formule correcte', () => {
    // capacity=16, R=1 (huitième) → perdants au rang 9
    expect(positionForLoserAtRound(16, 1)).toBe(9);
    expect(positionForLoserAtRound(16, 2)).toBe(5);
    expect(positionForLoserAtRound(16, 3)).toBe(3);
    expect(positionForLoserAtRound(16, 4)).toBe(2);
    expect(positionForLoserAtRound(8, 3)).toBe(2);   // finale
    expect(positionForLoserAtRound(4, 1)).toBe(3);   // demi
  });
});

describe('bracket · construction initiale', () => {
  const seeds4 = [
    { userId: 'u1', displayName: 'Alice' },
    { userId: 'u2', displayName: 'Bob' },
    { userId: 'u3', displayName: 'Charlie' },
    { userId: 'u4', displayName: 'Dana' },
  ];

  it('buildInitialBracket — structure correcte pour capacity=4', () => {
    const t = buildInitialBracket(4, seeds4);
    expect(t.rounds).toHaveLength(2);      // demi + finale
    expect(t.rounds[0].matches).toHaveLength(2);
    expect(t.rounds[1].matches).toHaveLength(1);
    // Round 1 alimenté
    expect(t.rounds[0].matches[0].slotA.userId).toBe('u1');
    expect(t.rounds[0].matches[0].slotB.userId).toBe('u2');
    expect(t.rounds[0].matches[1].slotA.userId).toBe('u3');
    expect(t.rounds[0].matches[1].slotB.userId).toBe('u4');
    // Pointeurs vers la finale : match 0 → slot A, match 1 → slot B
    expect(t.rounds[0].matches[0].nextMatchIndex).toBe(0);
    expect(t.rounds[0].matches[0].nextSlot).toBe('A');
    expect(t.rounds[0].matches[1].nextSlot).toBe('B');
    // Finale : slots vides
    expect(t.rounds[1].matches[0].slotA.userId).toBeNull();
    expect(t.rounds[1].matches[0].nextMatchIndex).toBeNull();  // pas de parent
  });

  it('buildInitialBracket — refuse si capacity ≠ nb seeds', () => {
    expect(() => buildInitialBracket(8 as any, seeds4)).toThrow();
  });
});

describe('bracket · avance incrémentale', () => {
  const seeds4 = [
    { userId: 'u1', displayName: 'Alice' },
    { userId: 'u2', displayName: 'Bob' },
    { userId: 'u3', displayName: 'Charlie' },
    { userId: 'u4', displayName: 'Dana' },
  ];

  it('advanceBracket — propage le gagnant + calcul final positions ex æquo', () => {
    const t = buildInitialBracket(4, seeds4);

    // Round 1 : u1 bat u2, u3 bat u4
    const r1 = advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 122, scoreB: 80, gameId: 'g1' });
    expect(r1.propagated).toBe(true);
    expect(r1.roundJustDone).toBeNull();          // pas encore, un match reste

    const r2 = advanceBracket(t, { roundIndex: 1, matchIndex: 1, winner: 'A', scoreA: 130, scoreB: 90, gameId: 'g2' });
    expect(r2.propagated).toBe(true);
    expect(r2.roundJustDone).toBe(1);
    expect(r2.tournamentDone).toBe(false);

    // Après R1, la finale est alimentée : u1 (A), u3 (B)
    expect(t.rounds[1].matches[0].slotA.userId).toBe('u1');
    expect(t.rounds[1].matches[0].slotB.userId).toBe('u3');

    // Finale : u1 bat u3
    const r3 = advanceBracket(t, { roundIndex: 2, matchIndex: 0, winner: 'A', scoreA: 121, scoreB: 100, gameId: 'g3' });
    expect(r3.tournamentDone).toBe(true);

    // Positions finales : u1=1, u3=2, u2 et u4 ex æquo 3ᵉ
    const pos = computeFinalPositions(t, 4);
    expect(pos.get('u1')).toBe(1);
    expect(pos.get('u3')).toBe(2);
    expect(pos.get('u2')).toBe(3);
    expect(pos.get('u4')).toBe(3);
  });

  it('advanceBracket — idempotent (même résultat rejoué sans effet)', () => {
    const t = buildInitialBracket(4, seeds4);
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 100, scoreB: 80, gameId: 'g1' });
    const before = JSON.stringify(t);
    const r = advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 100, scoreB: 80, gameId: 'g1' });
    expect(r.propagated).toBe(false);
    expect(JSON.stringify(t)).toBe(before);
  });

  it('findBracketMatchByMatchId — retrouve un nœud par son matchId', () => {
    const t = buildInitialBracket(4, seeds4);
    t.rounds[0].matches[1].matchId = 'match-xyz';
    const found = findBracketMatchByMatchId(t, 'match-xyz');
    expect(found).toEqual({ roundIndex: 1, matchIndex: 1 });
    expect(findBracketMatchByMatchId(t, 'nope')).toBeNull();
  });
});

describe('economics · prix par position', () => {
  it('occupantsAtPosition — cohérent avec computePositions', () => {
    expect(occupantsAtPosition(16, 1)).toBe(1);
    expect(occupantsAtPosition(16, 2)).toBe(1);
    expect(occupantsAtPosition(16, 3)).toBe(2);
    expect(occupantsAtPosition(16, 5)).toBe(4);
    expect(occupantsAtPosition(16, 9)).toBe(8);
    expect(occupantsAtPosition(16, 4)).toBe(0);   // rang inexistant
    expect(occupantsAtPosition(16, 17)).toBe(0);  // rang inexistant
  });

  it('tournamentEconomicsByPosition — capacité 16, exemple complet', () => {
    const r = tournamentEconomicsByPosition({
      capacity: 16, entryFee: 100,
      prizesByPosition: [
        { position: 1, prize: 500 },
        { position: 2, prize: 200 },
        { position: 3, prize: 100 },
        { position: 5, prize: 40 },
        { position: 9, prize: 10 },
      ],
    });
    // Collecté : 16 × 100 = 1600
    expect(r.totalCollected).toBe(1600);
    // Payé : 500 + 200 + 2×100 + 4×40 + 8×10 = 500 + 200 + 200 + 160 + 80 = 1140
    expect(r.totalPaid).toBe(1140);
    expect(r.houseNet).toBe(460);
  });

  it('tournamentEconomicsByPosition — capacité 4', () => {
    const r = tournamentEconomicsByPosition({
      capacity: 4, entryFee: 50,
      prizesByPosition: [
        { position: 1, prize: 100 },
        { position: 2, prize: 50 },
        { position: 3, prize: 20 },
      ],
    });
    expect(r.totalCollected).toBe(200);
    // 100 + 50 + 2×20 = 190
    expect(r.totalPaid).toBe(190);
    expect(r.houseNet).toBe(10);
  });
});
