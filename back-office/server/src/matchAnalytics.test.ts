/* =============================================================================
 * BACK-OFFICE · matchAnalytics.test.ts — Agrégation PURE des parties.
 * ========================================================================== */
import { describe, it, expect } from 'vitest';
import { aggregateVariantStats, type GameLike } from './matchAnalytics.js';

const game = (over: Partial<GameLike>): GameLike => ({
  winner: 'A', finalScoreA: 1500, finalScoreB: 1200, manchesWonA: 2, manchesWonB: 1, durationMs: 60000,
  stats: { totalDonnes: 6, capotsTotal: 0, belotesA: 0, belotesB: 0, contractsMade: 4, contractsFailed: 2, avgContract: 100 },
  ...over,
});

describe('aggregateVariantStats', () => {
  it('liste vide → tout à zéro, aucune division par zéro', () => {
    const s = aggregateVariantStats([]);
    expect(s.gamesPlayed).toBe(0);
    expect(s.winRateA).toBe(0);
    expect(s.contractSuccessRate).toBe(0);
    expect(s.avgDurationMs).toBe(0);
  });

  it('taux de victoire par équipe et nuls', () => {
    const s = aggregateVariantStats([
      game({ winner: 'A' }), game({ winner: 'A' }), game({ winner: 'B' }), game({ winner: null }),
    ]);
    expect(s.gamesPlayed).toBe(4);
    expect(s.winsA).toBe(2); expect(s.winsB).toBe(1); expect(s.draws).toBe(1);
    expect(s.winRateA).toBe(50);   // 2/4
    expect(s.winRateB).toBe(25);   // 1/4
  });

  it('moyennes de score, manches, donnes et durée', () => {
    const s = aggregateVariantStats([
      game({ finalScoreA: 1000, finalScoreB: 800, manchesWonA: 2, manchesWonB: 0, durationMs: 40000, stats: { totalDonnes: 4 } }),
      game({ finalScoreA: 2000, finalScoreB: 1600, manchesWonA: 2, manchesWonB: 2, durationMs: 80000, stats: { totalDonnes: 8 } }),
    ]);
    expect(s.avgScoreA).toBe(1500);
    expect(s.avgScoreB).toBe(1200);
    expect(s.avgManches).toBe(3);     // (2+4)/2
    expect(s.avgDonnes).toBe(6);      // (4+8)/2
    expect(s.avgDurationMs).toBe(60000);
  });

  it('taux de capot et de belote = % de parties concernées', () => {
    const s = aggregateVariantStats([
      game({ stats: { capotsTotal: 1, belotesA: 0, belotesB: 0 } }),
      game({ stats: { capotsTotal: 0, belotesA: 1, belotesB: 0 } }),
      game({ stats: { capotsTotal: 0, belotesA: 0, belotesB: 0 } }),
      game({ stats: { capotsTotal: 0, belotesA: 0, belotesB: 1 } }),
    ]);
    expect(s.capotRate).toBe(25);    // 1/4
    expect(s.beloteRate).toBe(50);   // 2/4
  });

  it('taux de réussite des contrats = tenus / (tenus + chutés)', () => {
    const s = aggregateVariantStats([
      game({ stats: { contractsMade: 3, contractsFailed: 1, avgContract: 90 } }),
      game({ stats: { contractsMade: 1, contractsFailed: 3, avgContract: 130 } }),
    ]);
    // total tenus 4, chutés 4 → 50 %
    expect(s.contractSuccessRate).toBe(50);
    expect(s.avgContract).toBe(110);  // (90+130)/2
  });
});
