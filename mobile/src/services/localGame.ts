/* =============================================================================
 * SERVICES · localGame.ts — Fabrique de partie LOCALE (mobile).
 * -----------------------------------------------------------------------------
 * Fonction PURE qui construit un moteur `GameEngine` + la liste des cerveaux
 * `RobotAlgorithm[]` à partir d'une configuration de partie. Utilisée par
 * `TableScreen` pour l'entraînement local ; testable en isolation.
 *
 * **Parité stricte avec le web et le serveur** : on emploie exactement les
 * mêmes fabriques de `belote-core` que `web/src/table/LocalTableEngine.ts` et
 * `server/src/modules/game/liveGame.service.ts` :
 *   • `robotFromFiche(fiche, fallback)` pour convertir une fiche serveur en
 *     `RobotConfig` (avec son `algoSpec` complet).
 *   • `makeRobot({...})` pour un robot générique « auto » (siège libre).
 *   • `createAlgorithm(robot, rules, onLog)` pour le cerveau exécutable.
 *
 * ➜ Un robot avec le même `algoSpec` prend LES MÊMES DÉCISIONS quel que soit
 *   l'endroit où il joue (mobile / web / back). C'est le contrat.
 * ========================================================================== */
import {
  ContreeRules, DEFAULT_PARTIE, GameEngine, createAlgorithm, makeRobot, robotFromFiche,
  type EnginePlayer, type RobotAlgorithm, type RobotConfig, type RobotFiche, type Seat,
} from 'belote-core';
import type { GameSetup } from './gameSetup';
import type { ServerRobot } from '../data/ApiClient';

/** Noms grecs pour les sièges « auto » (variété visuelle). */
const GREEK = ['Alpha', 'Bêta', 'Gamma', 'Delta'] as const;

/**
 * Convertit une `ServerRobot` (payload de l'API `/robots`) en `RobotFiche`
 * (type consommé par `robotFromFiche`). Ces deux types sont structurellement
 * compatibles ; on force juste le typage pour éviter les casts sauvages ailleurs.
 */
export function robotFicheFromServer(robot: ServerRobot): RobotFiche {
  return {
    id: robot.id,
    name: robot.name,
    personality: robot.personality,
    responseTimeMs: robot.responseTimeMs,
    maxPlayTimeMs: robot.maxPlayTimeMs,
    algoSpec: robot.algoSpec as RobotFiche['algoSpec'],
  };
}

/**
 * Résultat de la fabrique : moteur, fiches robots, cerveaux, siège humain.
 * Les fiches sont conservées pour l'extension surcoinche (`shouldSurcontrer`
 * a besoin de la fiche complète, pas seulement du cerveau).
 */
export interface LocalGameBuild {
  engine: GameEngine;
  players: EnginePlayer[];
  robots: (RobotConfig | null)[]; // null au siège humain (aucun robot)
  brains: (RobotAlgorithm | null)[]; // null au siège humain
  mySeat: Seat | null;
}

/**
 * Construit une partie locale prête à jouer.
 *
 * @param setup     configuration retournée par le dialogue GameSetup.
 * @param userRobots  fiches serveur de l'écurie de l'utilisateur (pour les
 *                    sièges dont il a explicitement choisi un robot).
 * @param onLog     callback de log optionnel (les décisions du cerveau y sont
 *                  poussées). Par défaut : muet.
 */
export function buildLocalGame(
  setup: GameSetup,
  userRobots: ServerRobot[],
  onLog: (entry: unknown) => void = () => {},
): LocalGameBuild {
  const rules = new ContreeRules();
  const mySeat = ((): Seat | null => {
    const idx = setup.seats.findIndex((s) => s === 'me');
    return idx === -1 ? null : (idx as Seat);
  })();

  const byId = new Map(userRobots.map((r) => [r.id, r]));

  const robots: (RobotConfig | null)[] = ([0, 1, 2, 3] as Seat[]).map((i) => {
    if (i === mySeat) return null; // le siège humain n'a pas de RobotConfig
    const choice = setup.seats[i];
    const chosen = choice !== 'auto' && choice !== 'me' ? byId.get(choice) : undefined;
    if (chosen) {
      // Robot CHOISI par l'utilisateur (fiche complète serveur) : on passe
      // l'algoSpec — c'est LUI qui doit jouer, avec sa personnalité et sa
      // convention exactes, comme sur le serveur.
      return robotFromFiche(robotFicheFromServer(chosen), { id: chosen.id, name: chosen.name });
    }
    // Robot « auto » : personnalité paramétrée pour varier visuellement.
    return makeRobot({
      id: `bot${i}`,
      name: GREEK[i] ?? `Robot ${i + 1}`,
      personality: { aggressiveness: 3 + i * 2, concentration: 5, velocity: 5 },
    });
  });

  const players: EnginePlayer[] = ([0, 1, 2, 3] as Seat[]).map((i) => {
    const r = robots[i];
    return {
      seat: i,
      name: r?.name ?? 'Vous',
      type: i === mySeat ? 'human' : 'robot',
      robotId: r?.id,
    };
  });

  const engine = new GameEngine(
    players,
    { ...DEFAULT_PARTIE, manches: setup.manches, local: true },
    rules,
  );

  const brains: (RobotAlgorithm | null)[] = robots.map((r) => (r ? createAlgorithm(r, rules, onLog) : null));

  return { engine, players, robots, brains, mySeat };
}
