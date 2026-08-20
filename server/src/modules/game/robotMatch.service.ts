/* =============================================================================
 * robotMatch.service — Simulation SERVEUR d'une partie 100% robots.
 * -----------------------------------------------------------------------------
 * Quand quatre robots s'affrontent, il n'y a AUCUN humain à attendre : la partie
 * n'a pas besoin de WebSocket, de session live temps réel, ni d'apparaître dans
 * la liste des parties en cours. On l'exécute d'un trait, côté serveur, puis on
 * la PERSISTE directement (agrégat + replay + stats) pour qu'elle apparaisse
 * dans l'HISTORIQUE avec son résultat et soit rejouable.
 *
 * Le déroulé est synchrone (pas de timers) : robots décident, on applique, on
 * enchaîne, jusqu'à `partie_end`. Sécurité anti-boucle : nombre d'itérations
 * borné très largement au-dessus de ce qu'une partie réelle peut atteindre.
 * ========================================================================== */
import {
  ContreeRules, createAlgorithm, GameEngine, robotFromFiche, robotAct, shouldSurcontrer,
  resolveTableConfig,
  type EnginePlayer, type RobotConfig, type Seat, type LogEntry,
} from 'belote-core';
import { RobotModel } from '../robot/robot.model.js';
import { gamePersistenceService, type PersistenceParticipant } from './gamePersistence.service.js';
import { createLogger } from '../../core/logger.js';

const logger = createLogger('robot-match');
const MAX_STEPS = 5000; // garde-fou : une partie réelle reste bien en-dessous

export interface RobotMatchInput {
  /** 4 identifiants de robots (sièges 0..3). */
  robotIds: string[];
  ownerId: string;
  teamId?: string | null;
  visibility?: 'public' | 'private';
  manches?: 1 | 2 | 4;
}

export interface RobotMatchResult {
  gameId: string;
  winner: 'A' | 'B' | null;
  scoreA: number;
  scoreB: number;
}

class RobotMatchService {
  /**
   * Joue une partie complète entre 4 robots, sans socket ni session live, et la
   * persiste dans l'historique. Renvoie l'ID de partie et le vainqueur.
   */
  async simulate(input: RobotMatchInput): Promise<RobotMatchResult> {
    if (input.robotIds.length !== 4) throw new Error('4 robots requis pour une partie entre robots');

    const robotDocuments = await RobotModel.find({ _id: { $in: input.robotIds } }).lean();
    const byId = new Map(robotDocuments.map((document: any) => [String(document._id), document]));

    const participants: PersistenceParticipant[] = input.robotIds.map((robotId, index) => ({
      seat: index as Seat,
      type: 'robot',
      robotId,
    }));
    const enginePlayers: EnginePlayer[] = input.robotIds.map((robotId, index) => {
      const document: any = byId.get(robotId);
      return { seat: index as Seat, name: document?.name ?? `Robot ${index + 1}`, type: 'robot', robotId };
    });

    // v17 — barème + orchestration résolus (partie locale entre robots).
    const { rulesConfig, partieConfig } = resolveTableConfig({
      manches: input.manches ?? 2, responseTimeMs: 0, maxPlayTimeMs: 0, local: true,
    });
    const contreeRules = new ContreeRules(rulesConfig);
    const engine = new GameEngine(enginePlayers, partieConfig, contreeRules);

    const logs: LogEntry[] = [];
    const robots = input.robotIds.map((robotId) => {
      const document: any = byId.get(robotId);
      return robotFromFiche(document ?? {}, { id: robotId, name: document?.name ?? 'Robot' });
    });
    const brains = robots.map((robot: RobotConfig) =>
      createAlgorithm(robot, contreeRules, (entry) => { logs.push(entry); if (logs.length > 500) logs.shift(); }),
    );

    // Boucle synchrone jusqu'à la fin de partie.
    let steps = 0;
    while (engine.phase !== 'partie_end' && steps++ < MAX_STEPS) {
      const view = engine.view();

      if (view.awaitingCollect) { engine.collectTrick(); continue; }
      if (engine.phase === 'donne_end') { engine.nextDonne(); continue; }
      if (engine.phase === 'manche_end') { engine.nextManche(); continue; }

      // Micro-phase surcontre (uniquement le camp preneur décide).
      if (engine.phase === 'surcontre') {
        const pending = view.surcontreSeats as Seat[];
        for (const seat of pending) {
          const decide = shouldSurcontrer(robots[seat], engine.view(), seat);
          engine.submitBid(seat, { action: decide ? 'surcontree' : 'pass' });
        }
        continue;
      }

      const seat = engine.turn;
      if (seat == null) break;
      const action = robotAct(engine, seat, brains[seat]);
      if (action.kind === 'bid') {
        const result = engine.submitBid(seat, action.bid);
        if (!result.ok) engine.submitBid(seat, { action: 'pass' });
      } else {
        engine.playCard(seat, action.card);
      }
    }

    if (engine.phase !== 'partie_end') {
      logger.warn('simulation robots non terminée (garde-fou atteint)', { steps });
    }

    const { gameId, winner } = await gamePersistenceService.persistFinishedGame({
      engine,
      tableId: null,
      sessionId: null,
      ownerId: input.ownerId,
      teamId: input.teamId ?? null,
      visibility: input.visibility ?? 'private',
      mode: 'online',
      kind: 'royal', // 4 robots = configuration « carré » (tous IA)
      participants,
      logs: logs.slice(-500),
      substituteSeats: new Set(),
      events: [],
    });

    const finalManche = engine.manches[engine.manches.length - 1];
    logger.info('partie robots simulée et archivée', { gameId, winner });
    return { gameId, winner: winner ?? null, scoreA: finalManche.cumulative.A, scoreB: finalManche.cumulative.B };
  }
}

export const robotMatchService = new RobotMatchService();
