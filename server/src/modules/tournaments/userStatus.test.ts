/* =============================================================================
 * v16 — Statut d'un joueur dans un tournoi live (waiting / playing / …).
 * Scénario : bracket 4 joueurs (2 demi-finales → 1 finale).
 *   Demi 0 : u0 vs u1   Demi 1 : u2 vs u3   → Finale : (gagnant demi0) vs (gagnant demi1)
 * ========================================================================== */
import { describe, it, expect } from 'vitest';
import { buildInitialBracket, advanceBracket } from './bracket.js';
import { computeUserTournamentStatus } from './userStatus.js';

const seeds = [
  { userId: 'u0', displayName: 'U0' },
  { userId: 'u1', displayName: 'U1' },
  { userId: 'u2', displayName: 'U2' },
  { userId: 'u3', displayName: 'U3' },
];
const fresh = () => buildInitialBracket(4, seeds);

describe('computeUserTournamentStatus (v16)', () => {
  it('joueur hors bracket → none', () => {
    expect(computeUserTournamentStatus(fresh(), 'zzz').state).toBe('none');
  });

  it('round 1 en cours (matchId posé) → playing, avec mon matchId', () => {
    const t = fresh();
    t.rounds[0].matches[0].matchId = 'm-demi0';
    const s = computeUserTournamentStatus(t, 'u0');
    expect(s.state).toBe('playing');
    expect(s.myMatchId).toBe('m-demi0');
  });

  it('gagnant de sa demi, l’autre demi PAS finie → waiting sur l’autre demi', () => {
    const t = fresh();
    t.rounds[0].matches[0].matchId = 'm-demi0';
    t.rounds[1].matches[0].matchId = null;
    // u0 gagne la demi 0 → propagé en finale (slot A). Demi 1 encore en cours.
    t.rounds[0].matches[1].matchId = 'm-demi1';
    t.rounds[0].matches[1].scoreA = 300; t.rounds[0].matches[1].scoreB = 220;
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 501, scoreB: 300, gameId: 'g0' });

    const s = computeUserTournamentStatus(t, 'u0');
    expect(s.state).toBe('waiting');
    expect(s.roundIndex).toBe(2);                 // ma finale
    expect(s.awaiting).toHaveLength(1);
    expect(s.awaiting[0].matchId).toBe('m-demi1'); // je regarde l’autre demi
    expect(s.awaiting[0].scoreA).toBe(300);        // score EN DIRECT
    expect(s.awaiting[0].scoreB).toBe(220);
  });

  it('les deux demies finies, finale pas encore créée → pending', () => {
    const t = fresh();
    t.rounds[0].matches[0].matchId = 'm-demi0';
    t.rounds[0].matches[1].matchId = 'm-demi1';
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 501, scoreB: 300, gameId: 'g0' });
    advanceBracket(t, { roundIndex: 1, matchIndex: 1, winner: 'A', scoreA: 501, scoreB: 100, gameId: 'g1' });
    // Finale : slotA=u0, slotB=u2, pas de matchId encore.
    const s = computeUserTournamentStatus(t, 'u0');
    expect(s.state).toBe('pending');
    expect(s.roundIndex).toBe(2);
  });

  it('finale créée et en cours → playing', () => {
    const t = fresh();
    t.rounds[0].matches[0].matchId = 'm-demi0';
    t.rounds[0].matches[1].matchId = 'm-demi1';
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 501, scoreB: 300, gameId: 'g0' });
    advanceBracket(t, { roundIndex: 1, matchIndex: 1, winner: 'A', scoreA: 501, scoreB: 100, gameId: 'g1' });
    t.rounds[1].matches[0].matchId = 'm-finale';
    const s = computeUserTournamentStatus(t, 'u0');
    expect(s.state).toBe('playing');
    expect(s.myMatchId).toBe('m-finale');
  });

  it('perdant de sa demi → eliminated', () => {
    const t = fresh();
    t.rounds[0].matches[0].matchId = 'm-demi0';
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 501, scoreB: 200, gameId: 'g0' });
    expect(computeUserTournamentStatus(t, 'u1').state).toBe('eliminated');
  });

  it('vainqueur de la finale → champion', () => {
    const t = fresh();
    t.rounds[0].matches[0].matchId = 'm-demi0';
    t.rounds[0].matches[1].matchId = 'm-demi1';
    advanceBracket(t, { roundIndex: 1, matchIndex: 0, winner: 'A', scoreA: 501, scoreB: 300, gameId: 'g0' });
    advanceBracket(t, { roundIndex: 1, matchIndex: 1, winner: 'A', scoreA: 501, scoreB: 100, gameId: 'g1' });
    t.rounds[1].matches[0].matchId = 'm-finale';
    advanceBracket(t, { roundIndex: 2, matchIndex: 0, winner: 'A', scoreA: 501, scoreB: 400, gameId: 'g2' });
    expect(computeUserTournamentStatus(t, 'u0').state).toBe('champion');
  });
});
