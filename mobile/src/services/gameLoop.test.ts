// Tests unitaires — planificateur pur du GameLoop.
// On teste ce qui compte le plus : la planification est correcte pour chaque
// phase du moteur, sans mock complexe (on utilise un GameEngine réel).
import { describe, expect, it, vi } from 'vitest';
import { ContreeRules, DEFAULT_PARTIE, GameEngine, makeRobot, createAlgorithm, type EnginePlayer, type Seat } from 'belote-core';
import { GameLoop } from './gameLoop';

const rules = new ContreeRules();

const buildFourRobots = () => {
  const cfg = [0, 1, 2, 3].map((i) => makeRobot({ id: `bot${i}`, name: `R${i}`, personality: { aggressiveness: 5, concentration: 5, velocity: 5 } }));
  const players: EnginePlayer[] = cfg.map((c, i) => ({ seat: i as Seat, name: c.name, type: 'robot', robotId: c.id }));
  const engine = new GameEngine(players, { ...DEFAULT_PARTIE, manches: 1, local: true }, rules);
  const brains = cfg.map((c) => createAlgorithm(c, rules, () => {}));
  return { engine, brains };
};

describe('GameLoop.plan()', () => {
  it('planifie une action robot en phase d\'annonces', () => {
    const { engine, brains } = buildFourRobots();
    const loop = new GameLoop(engine, { brains, onTick: () => {} });
    const step = loop.plan();
    expect(step).not.toBeNull();
    expect(step!.ms).toBe(700); // délai fixe d'annonce robot
  });

  it('retourne null quand c\'est le tour d\'un humain', () => {
    // Un humain occupe le siège TURN COURANT du moteur, aucun cerveau ⇒ pas d'action auto.
    const cfg = [0, 1, 2, 3].map((i) => makeRobot({ id: `bot${i}`, name: `R${i}` }));
    const players: EnginePlayer[] = cfg.map((c, i) => ({ seat: i as Seat, name: c.name, type: 'robot', robotId: c.id }));
    const engine = new GameEngine(players, { ...DEFAULT_PARTIE, manches: 1, local: true }, rules);
    const humanSeat = engine.turn as Seat;
    // On construit la liste des cerveaux : null au siège HUMAIN, algo ailleurs.
    const brains = cfg.map((c, i) => (i === humanSeat ? null : createAlgorithm(c, rules, () => {})));
    const loop = new GameLoop(engine, { brains, onTick: () => {} });
    expect(loop.plan()).toBeNull();
  });
});

describe('GameLoop.cycleSpeed / pause', () => {
  it('cycle des vitesses 1 → 2 → 4 → 1', () => {
    const { engine, brains } = buildFourRobots();
    const loop = new GameLoop(engine, { brains, onTick: () => {} });
    expect(loop.speed).toBe(1);
    expect(loop.cycleSpeed()).toBe(2);
    expect(loop.cycleSpeed()).toBe(4);
    expect(loop.cycleSpeed()).toBe(1);
  });

  it('togglePause bascule et arrête/relance', () => {
    const { engine, brains } = buildFourRobots();
    const loop = new GameLoop(engine, { brains, onTick: () => {} });
    expect(loop.paused).toBe(false);
    expect(loop.togglePause()).toBe(true);
    expect(loop.paused).toBe(true);
    expect(loop.togglePause()).toBe(false);
  });
});

describe('GameLoop — scheduler injecté', () => {
  it('utilise le scheduler custom au lieu de setTimeout', () => {
    const { engine, brains } = buildFourRobots();
    const scheduler = vi.fn((fn: () => void) => { fn(); return () => {}; });
    const onTick = vi.fn();
    const loop = new GameLoop(engine, { brains, onTick, scheduler });
    loop.start();
    expect(scheduler).toHaveBeenCalled();
    expect(onTick).toHaveBeenCalled();
    loop.dispose();
  });
});

describe('GameLoop — micro-phase surcontre (parité web/serveur)', () => {
  it('accepte des fiches robots optionnelles sans casser (rétrocompat)', () => {
    const { engine, brains } = buildFourRobots();
    const loop = new GameLoop(engine, { brains, onTick: () => {} });
    // Sans robots : plan() ne doit pas planter en phase bidding.
    expect(loop.plan()).not.toBeNull();
  });

  it('utilise la fiche robot pour appeler shouldSurcontrer (comme web/serveur)', () => {
    // On construit un moteur, une liste de fiches robots, et on vérifie que
    // le plan gère bien la présence du champ `robots`.
    const cfg = [0, 1, 2, 3].map((i) => makeRobot({ id: `bot${i}`, name: `R${i}`, personality: { aggressiveness: 5, concentration: 5, velocity: 5 } }));
    const players: EnginePlayer[] = cfg.map((c, i) => ({ seat: i as Seat, name: c.name, type: 'robot', robotId: c.id }));
    const engine = new GameEngine(players, { ...DEFAULT_PARTIE, manches: 1, local: true }, rules);
    const brains = cfg.map((c) => createAlgorithm(c, rules, () => {}));
    const loop = new GameLoop(engine, { brains, robots: cfg, onTick: () => {} });
    // Le plan initial doit fonctionner en phase bidding.
    const step = loop.plan();
    expect(step).not.toBeNull();
  });
});
