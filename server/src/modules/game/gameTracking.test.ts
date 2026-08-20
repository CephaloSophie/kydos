/* =============================================================================
 * GAME · gameTracking.test.ts — Dérivations PURES du suivi enrichi.
 * ========================================================================== */
import { describe, it, expect } from 'vitest';
import { deriveExtraStats, replayDurationMs, type DonneLike } from './gameTracking.js';

const d = (over: Partial<DonneLike>): DonneLike => ({
  bidderTeam: 'A', contract: 100, contractMet: true, tricks: { A: 5, B: 3 }, ...over,
});

describe('deriveExtraStats', () => {
  it('agrège plis, contrats tenus/chutés et moyenne de contrat', () => {
    const s = deriveExtraStats([
      d({ contract: 90, contractMet: true, tricks: { A: 6, B: 2 } }),
      d({ contract: 110, contractMet: false, tricks: { A: 3, B: 5 } }),
      d({ bidderTeam: 'B', contract: 130, contractMet: true, tricks: { A: 2, B: 6 } }),
    ]);
    expect(s.totalTricks).toBe(8 + 8 + 8);         // 3 donnes × 8 plis
    expect(s.contractsMade).toBe(2);               // 90 (A) + 130 (B)
    expect(s.contractsFailed).toBe(1);             // 110 (A)
    expect(s.avgContract).toBe(110);               // (90+110+130)/3
  });

  it('donne sans preneur : ni tenu ni chuté', () => {
    const s = deriveExtraStats([d({ bidderTeam: null, contract: null, contractMet: false, tricks: { A: 4, B: 4 } })]);
    expect(s.contractsMade).toBe(0);
    expect(s.contractsFailed).toBe(0);
    expect(s.avgContract).toBe(0);                 // aucun contrat numérique
    expect(s.totalTricks).toBe(8);
  });

  it('liste vide → tout à zéro (pas de division par zéro)', () => {
    expect(deriveExtraStats([])).toEqual({ totalTricks: 0, contractsMade: 0, contractsFailed: 0, avgContract: 0 });
  });
});

describe('replayDurationMs', () => {
  it('écart entre le 1ᵉʳ et le dernier horodatage d\'opération', () => {
    const replay = {
      manches: [
        { donnes: [{ operations: [{ at: 1000 }, { at: 1500 }] }] },
        { donnes: [{ operations: [{ at: 2000 }, { at: 9000 }] }] },
      ],
    };
    expect(replayDurationMs(replay)).toBe(8000);   // 9000 − 1000
  });

  it('replay vide / invalide → 0', () => {
    expect(replayDurationMs(null)).toBe(0);
    expect(replayDurationMs({})).toBe(0);
    expect(replayDurationMs({ manches: [] })).toBe(0);
    expect(replayDurationMs({ manches: [{ donnes: [{ operations: [] }] }] })).toBe(0);
  });
});
