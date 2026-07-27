// Unit tests for the pure game-stats computer derived from a full replay.
import { describe, expect, it } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { ContreeRules } from '../rules/ContreeRules';
import { computeGameStats } from './GameStats';
import { makeRobot, createAlgorithm, robotAct } from '../engine/RobotDriver';
import type { EnginePlayer, PartieConfig } from '../engine/types';
import type { Seat } from '../domain/types';

const rules = new ContreeRules();

/** Plays a full robot-vs-robot game synchronously and returns the engine. */
function playFullGame(manches: 1 | 2 | 4 = 1): GameEngine {
  const players: EnginePlayer[] = [0, 1, 2, 3].map((i) => ({ seat: i as Seat, name: `R${i}`, type: 'robot' as const, robotId: `r${i}` }));
  const config: PartieConfig = { manches, baseTarget: 1500, labelTarget: 2000, responseTimeMs: 0, maxPlayTimeMs: 0, clockwise: false, local: true, signals: { reflexion: true, repeatSuit: true } };
  const engine = new GameEngine(players, config, rules);
  const brains = players.map((_, i) => createAlgorithm(makeRobot({ id: `r${i}`, name: `R${i}`, personality: { aggressiveness: 5, concentration: 5, velocity: 5 } }), rules));
  let steps = 0;
  while (engine.phase !== 'partie_end' && steps++ < 5000) {
    const v = engine.view();
    if (v.awaitingCollect) { engine.collectTrick(); continue; }
    if (engine.phase === 'donne_end') { engine.nextDonne(); continue; }
    if (engine.phase === 'manche_end') { engine.nextManche(); continue; }
    if (engine.phase === 'surcontre') { for (const s of v.surcontreSeats as Seat[]) engine.submitBid(s, { action: 'pass' }); continue; }
    const seat = engine.turn; if (seat == null) break;
    const action = robotAct(engine, seat, brains[seat]);
    if (action.kind === 'bid') { const r = engine.submitBid(seat, action.bid); if (!r.ok) engine.submitBid(seat, { action: 'pass' }); }
    else engine.playCard(seat, action.card);
  }
  return engine;
}

describe('computeGameStats', () => {
  it('derives consistent aggregate stats from a completed game', () => {
    const engine = playFullGame(1);
    expect(engine.phase).toBe('partie_end');
    const stats = computeGameStats(engine.toReplay());

    // At least one donne played.
    expect(stats.totalDonnes).toBeGreaterThan(0);
    // Each donne has 8 tricks, so total tricks = 8 * donnes.
    expect(stats.totalTricks.A + stats.totalTricks.B).toBe(stats.totalDonnes * 8);
    // A winner exists and matches final score ordering.
    expect(['A', 'B']).toContain(stats.winner);
    if (stats.winner === 'A') expect(stats.finalScore.A).toBeGreaterThanOrEqual(stats.finalScore.B);
    // Per-donne breakdown length matches totalDonnes.
    expect(stats.donnes.length).toBe(stats.totalDonnes);
    // Contres réussis never exceed contres posés.
    expect(stats.contresReussies).toBeLessThanOrEqual(stats.contres.total);
    // Capots counts are coherent.
    expect(stats.capots.A + stats.capots.B).toBe(stats.capots.total);
  });
});

describe('replay operation shape (locks the ReplayScreen contract)', () => {
  it('play operations carry the seat at the top level, not inside data', () => {
    const engine = playFullGame(1);
    const donne = engine.toReplay().manches[0].donnes[0];
    const playOps = donne.operations.filter((o) => o.type === 'play');
    expect(playOps.length).toBeGreaterThan(0);
    // The mobile replay reads op.seat (top-level). Guard against a regression
    // that would move the seat into op.data (which silently broke card display).
    for (const op of playOps) {
      expect(typeof (op as unknown as { seat?: number }).seat).toBe('number');
      expect((op.data as { card?: unknown }).card).toBeTruthy();
    }
  });
});
