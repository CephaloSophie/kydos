import {
  ContreeRules,
  createAlgorithm,
  DEFAULT_PARTIE,
  GameEngine,
  makeRobot,
  robotAct,
  type EnginePlayer,
} from '../src/index';

const rules = new ContreeRules();
const robots = [
  makeRobot({ id: 'r0', name: 'Athéna', personality: { aggressiveness: 7, concentration: 6, velocity: 8 } }),
  makeRobot({ id: 'r1', name: 'Borée', personality: { aggressiveness: 4, concentration: 5, velocity: 5 } }),
  makeRobot({ id: 'r2', name: 'Calliope', personality: { aggressiveness: 6, concentration: 7, velocity: 6 } }),
  makeRobot({ id: 'r3', name: 'Damon', personality: { aggressiveness: 3, concentration: 8, velocity: 4 } }),
];
const players: EnginePlayer[] = robots.map((r, i) => ({ seat: i as 0 | 1 | 2 | 3, name: r.name, type: 'robot', robotId: r.id }));
const engine = new GameEngine(players, { ...DEFAULT_PARTIE, manches: 4 }, rules, 42);
const brains = robots.map((r) => createAlgorithm(r, rules));

let guard = 0;
while (engine.phase !== 'partie_end' && guard++ < 5000) {
  if (engine.phase === 'donne_end') { engine.nextDonne(); continue; }
  if (engine.phase === 'manche_end') { engine.nextManche(); continue; }
  if (engine.view().awaitingCollect) { engine.collectTrick(); continue; }
  const seat = engine.turn!;
  const act = robotAct(engine, seat, brains[seat]);
  if (act.kind === 'bid') {
    const res = engine.submitBid(seat, act.bid);
    if (!res.ok) engine.submitBid(seat, { action: 'pass' });
  } else engine.playCard(seat, act.card);
}

const v = engine.view();
console.log('Phase finale :', engine.phase);
console.log('Manches gagnées A/B :', engine.manchesWon);
console.log('Vainqueur de la partie :', engine.partieWinner);
console.log('Nb de manches jouées :', engine.manches.length);
console.log('Donnes manche 1 :', engine.manches[0].donnes.length, '| cumul final', engine.manches[0].cumulative);
console.log('Itérations :', guard);
