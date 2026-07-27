// Démo : TOUT le métier tourne SANS serveur ni Mongo, via les use cases + adapters
// mémoire + GameSession. Prouve que n'importe quel front (web/mobile) peut consommer
// la même couche application et JOUER en local.
import {
  ContreeRules, createAlgorithm, GameEngine, makeRobot, DEFAULT_PARTIE,
  type EnginePlayer, type Seat,
} from 'belote-core';
import {
  createInMemoryDeps, createRobot, createTeam, joinTeam, listTeamsRanked,
  searchPlayers, saveGame, TableService, GameSession,
} from '../src/index';

async function main() {
  const deps = createInMemoryDeps();

  // 1) Utilisateurs + équipe (use cases purs)
  const ameur = await deps.users.create({ username: 'ameur' });
  const invite = await deps.users.create({ username: 'invite' });
  const team = await createTeam(deps, { name: 'Les Atouts', ownerId: ameur.id });
  await joinTeam(deps, { userId: invite.id, teamId: team.id });
  console.log('Équipe créée :', team.name, '| membres recherchés "am":', (await searchPlayers(deps, 'am')).map((u) => u.username));

  // 2) Robots d'Ameur (use case createRobot, AlgoSpec normalisée)
  const r1 = await createRobot(deps, { ownerId: ameur.id, name: 'Iznogoud', personality: { aggressiveness: 8, concentration: 6, velocity: 7 }, algoSpec: { name: 'Agressif' }, offlineEnabled: true, representativeSlot: 1 });
  const r2 = await createRobot(deps, { ownerId: ameur.id, name: 'Roboubelot', personality: { aggressiveness: 4, concentration: 7, velocity: 5 }, algoSpec: { name: 'Classique' }, representativeSlot: 2 });

  // 3) Invariants de table
  const tables = new TableService();
  const t = tables.create('t1', ameur.id, { visibility: 'public', manches: 2 });
  console.log('Robot 1 en siège A (0) :', tables.addRobot('t1', 0, r1));
  console.log('Robot 2 en siège B adverse (1) :', tables.addRobot('t1', 1, r2), '<- doit être REFUSÉ (même proprio, équipes opposées)');
  console.log('Robot 2 en siège A (2) :', tables.addRobot('t1', 2, r2), '<- accepté (même équipe)');

  // 4) Jouer une partie complète via GameSession (réutilisable par tout front)
  const rules = new ContreeRules();
  const cfgs = [r1, r2, r1, r2].map((r, i) => makeRobot({ id: r.id + i, name: r.name, personality: r.personality, responseTimeMs: r.responseTimeMs, maxPlayTimeMs: r.maxPlayTimeMs, algoSpec: r.algoSpec }));
  const players: EnginePlayer[] = cfgs.map((c, i) => ({ seat: i as Seat, name: c.name, type: 'robot', robotId: c.id }));
  const engine = new GameEngine(players, { ...DEFAULT_PARTIE, manches: 2, local: true }, rules, 42);
  const session = new GameSession(engine, cfgs.map((c) => createAlgorithm(c, rules)));

  let guard = 0;
  while (!session.isOver() && guard++ < 8000) session.step();
  console.log('Partie jouée via GameSession -> vainqueur', session.winner(), '| manches', session.summary().manchesWon);

  // 5) Sauvegarde (port GameRepository)
  const gameId = await saveGame(deps, { ownerId: ameur.id, players: [ameur.id], teamId: team.id, visibility: 'team', mode: 'local', winner: session.winner(), target: 1500, replay: session.replay() });
  console.log('Partie sauvegardée (visibilité team) id =', gameId);
}
main();
