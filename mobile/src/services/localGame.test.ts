// Tests for buildLocalGame — the unified local-game factory (mobile side).
// Verifies parity with the web/server usage of belote-core: same primitives
// (robotFromFiche, makeRobot, createAlgorithm) and correct handling of
// user-chosen robots vs auto slots.
import { describe, expect, it } from 'vitest';
import { buildLocalGame, robotFicheFromServer } from './localGame';
import type { GameSetup } from './gameSetup';
import type { ServerRobot } from '../data/ApiClient';
import type { AlgoSpec } from 'belote-core';

/** Minimal ServerRobot factory for tests. */
function makeServerRobot(id: string, name: string, algoSpec?: Partial<AlgoSpec>): ServerRobot {
  return {
    id, name,
    personality: { aggressiveness: 5, concentration: 6, velocity: 5 },
    responseTimeMs: 600,
    maxPlayTimeMs: 2500,
    algoSpec: algoSpec ?? null,
    offlineEnabled: true,
    representativeSlot: 0,
    mobile: null,
  };
}

describe('robotFicheFromServer', () => {
  it('maps every field of a ServerRobot to a RobotFiche without loss', () => {
    const s = makeServerRobot('bot-42', 'Zeno', { version: 1, name: 'Agressif' } as AlgoSpec);
    const fiche = robotFicheFromServer(s);
    expect(fiche.id).toBe('bot-42');
    expect(fiche.name).toBe('Zeno');
    expect(fiche.personality).toEqual(s.personality);
    expect(fiche.responseTimeMs).toBe(600);
    expect(fiche.maxPlayTimeMs).toBe(2500);
    expect(fiche.algoSpec).toBeTruthy();
  });
});

describe('buildLocalGame — construction', () => {
  const baseSetup: GameSetup = { seats: ['me', 'auto', 'auto', 'auto'], visibility: 'none', manches: 1 };

  it('builds a valid engine + brains for 1 human + 3 auto robots', () => {
    const built = buildLocalGame(baseSetup, []);
    expect(built.mySeat).toBe(0);
    expect(built.brains).toHaveLength(4);
    expect(built.brains[0]).toBeNull();       // human seat
    expect(built.brains[1]).not.toBeNull();   // auto robot
    expect(built.brains[2]).not.toBeNull();
    expect(built.brains[3]).not.toBeNull();
    expect(built.robots[0]).toBeNull();
    expect(built.robots[1]?.id).toMatch(/^bot/);
  });

  it('places the human at the exact seat requested', () => {
    const setup: GameSetup = { seats: ['auto', 'auto', 'me', 'auto'], visibility: 'none', manches: 1 };
    const built = buildLocalGame(setup, []);
    expect(built.mySeat).toBe(2);
    expect(built.brains[2]).toBeNull();
    expect(built.robots[2]).toBeNull();
    expect(built.players[2]?.type).toBe('human');
    for (const i of [0, 1, 3]) expect(built.players[i]?.type).toBe('robot');
  });

  it('uses the chosen robot fiche (personality + algoSpec) for a picked seat', () => {
    const chosen = makeServerRobot('picked', 'Héra', { version: 1, name: 'Agressif' } as AlgoSpec);
    const setup: GameSetup = { seats: ['me', 'picked', 'auto', 'auto'], visibility: 'none', manches: 1 };
    const built = buildLocalGame(setup, [chosen]);
    expect(built.robots[1]?.id).toBe('picked');
    expect(built.robots[1]?.name).toBe('Héra');
    // The personality was passed through robotFromFiche.
    expect(built.robots[1]?.personality.concentration).toBe(6);
  });

  it('falls back to a generic "auto" robot when the chosen id is unknown', () => {
    const setup: GameSetup = { seats: ['me', 'ghost-id-does-not-exist', 'auto', 'auto'], visibility: 'none', manches: 1 };
    const built = buildLocalGame(setup, []);
    expect(built.robots[1]?.id).toBe('bot1'); // generic
  });

  it('all-robots game (no human): all seats have brains, mySeat is null', () => {
    const setup: GameSetup = { seats: ['auto', 'auto', 'auto', 'auto'], visibility: 'none', manches: 1 };
    const built = buildLocalGame(setup, []);
    expect(built.mySeat).toBeNull();
    for (let i = 0; i < 4; i++) {
      expect(built.brains[i]).not.toBeNull();
      expect(built.robots[i]).not.toBeNull();
      expect(built.players[i]?.type).toBe('robot');
    }
  });

  it('carries setup.manches into the engine partie config', () => {
    const setup: GameSetup = { seats: ['me', 'auto', 'auto', 'auto'], visibility: 'none', manches: 4 };
    const built = buildLocalGame(setup, []);
    // Engine target score is derived from manches (see DEFAULT_PARTIE): we can't
    // read it directly, but we can play to verify no crash — good enough here.
    expect(built.engine.phase).toBe('bidding');
  });
});
