/* =============================================================================
 * TOURNAMENTS · royal-bracket.test.ts — Carrée royale en tournoi (v14.14).
 * -----------------------------------------------------------------------------
 * Carrée royale : chaque nœud du bracket oppose 2 ÉQUIPES de 2 humains. Les
 * équipes sont formées au démarrage et restent fixes jusqu'à la fin. Le
 * bracket se joue donc sur `capacity / 2` feuilles (équipes), et chaque rang
 * final est occupé par les 2 coéquipiers de chaque équipe.
 * ========================================================================== */
import { describe, expect, it } from 'vitest';
import {
  formTeamSeeds,
  buildInitialBracket,
  advanceBracket,
  computeFinalPositions,
} from './bracket.js';
import { tournamentEconomicsByPosition } from './economics.js';

const P = (n: number) => ({ userId: `u${n}`, displayName: `Joueur ${n}` });

describe('Carrée royale · formation des équipes', () => {
  it('formTeamSeeds — paire les participants consécutifs', () => {
    const seeds = formTeamSeeds([P(0), P(1), P(2), P(3)]);
    expect(seeds).toHaveLength(2);
    expect(seeds[0]).toMatchObject({ userId: 'u0', userId2: 'u1' });
    expect(seeds[1]).toMatchObject({ userId: 'u2', userId2: 'u3' });
  });

  it('formTeamSeeds — refuse un nombre impair', () => {
    expect(() => formTeamSeeds([P(0), P(1), P(2)])).toThrow();
  });
});

describe('Carrée royale · bracket sur équipes', () => {
  it('buildInitialBracket — 8 humains → 4 équipes → 2 rounds', () => {
    const seeds = formTeamSeeds([P(0), P(1), P(2), P(3), P(4), P(5), P(6), P(7)]);
    const tree = buildInitialBracket(seeds.length, seeds); // 4 feuilles
    expect(tree.rounds).toHaveLength(2);            // demi + finale
    expect(tree.rounds[0].matches).toHaveLength(2); // 2 demi-finales
    expect(tree.rounds[1].matches).toHaveLength(1); // 1 finale
    // Chaque slot du round 1 porte bien une équipe de 2.
    const m0 = tree.rounds[0].matches[0];
    expect(m0.slotA).toMatchObject({ userId: 'u0', userId2: 'u1' });
    expect(m0.slotB).toMatchObject({ userId: 'u2', userId2: 'u3' });
  });

  it('advanceBracket — propage l\'équipe gagnante (2 coéquipiers) au round suivant', () => {
    const seeds = formTeamSeeds([P(0), P(1), P(2), P(3), P(4), P(5), P(6), P(7)]);
    const tree = buildInitialBracket(seeds.length, seeds);
    // Équipe (u0,u1) gagne la demi 0.
    advanceBracket(tree, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 501, scoreB: 300, gameId: 'g0' });
    const finale = tree.rounds[1].matches[0];
    expect(finale.slotA).toMatchObject({ userId: 'u0', userId2: 'u1' });
  });

  it('computeFinalPositions — les 2 coéquipiers partagent le même rang', () => {
    const seeds = formTeamSeeds([P(0), P(1), P(2), P(3), P(4), P(5), P(6), P(7)]);
    const tree = buildInitialBracket(seeds.length, seeds);
    // Demi-finales : (u0,u1) bat (u2,u3) ; (u4,u5) bat (u6,u7).
    advanceBracket(tree, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 501, scoreB: 200, gameId: 'g0' });
    advanceBracket(tree, { roundIndex: 1, matchIndex: 1, winner: 'A', scoreA: 501, scoreB: 100, gameId: 'g1' });
    // Finale : (u0,u1) bat (u4,u5).
    advanceBracket(tree, { roundIndex: 2, matchIndex: 0, winner: 'A', scoreA: 501, scoreB: 400, gameId: 'g2' });

    const pos = computeFinalPositions(tree, seeds.length); // rangs sur 4 équipes
    // Champions (rang 1) : u0 et u1.
    expect(pos.get('u0')).toBe(1);
    expect(pos.get('u1')).toBe(1);
    // Finalistes perdants (rang 2) : u4 et u5.
    expect(pos.get('u4')).toBe(2);
    expect(pos.get('u5')).toBe(2);
    // Perdants des demi (rang 3, ex æquo) : u2,u3,u6,u7.
    for (const u of ['u2', 'u3', 'u6', 'u7']) expect(pos.get(u)).toBe(3);
  });
});

describe('Carrée royale · économie (2 humains par occupant de rang)', () => {
  it('tournamentEconomicsByPosition — leaves + teamSize doublent les occupants', () => {
    // 8 humains, buy-in 100. Bracket sur 4 équipes.
    // Rangs équipes : 1 (1 équipe), 2 (1 équipe), 3 (2 équipes ex æquo).
    const res = tournamentEconomicsByPosition({
      capacity: 8, entryFee: 100, leaves: 4, teamSize: 2,
      prizesByPosition: [{ position: 1, prize: 300 }, { position: 2, prize: 150 }, { position: 3, prize: 50 }],
    });
    expect(res.totalCollected).toBe(800);       // 8 × 100
    // Occupants humains : rang1 = 1 équipe × 2 = 2 ; rang2 = 2 ; rang3 = 2 équipes × 2 = 4.
    const byPos = Object.fromEntries(res.breakdown.map((b) => [b.position, b.occupants]));
    expect(byPos[1]).toBe(2);
    expect(byPos[2]).toBe(2);
    expect(byPos[3]).toBe(4);
    // totalPaid = 2×300 + 2×150 + 4×50 = 600 + 300 + 200 = 1100.
    expect(res.totalPaid).toBe(1100);
    expect(res.houseNet).toBe(800 - 1100);
  });
});
