import {
  ContreeRules, DEFAULT_PARTIE, GameEngine, createAlgorithm, robotFromFiche, robotAct, shouldSurcontrer,
  type EnginePlayer, type LogEntry, type RobotAlgorithm, type RobotConfig, type Seat,
} from 'belote-core';
import { RobotModel } from '../robot/robot.model.js';
import { gamePersistenceService, type PersistenceParticipant } from '../game/gamePersistence.service.js';

const contreeRules = new ContreeRules();
const MAX_STEPS = 20000; // garde-fou anti-boucle

export interface CompetitionLineup {
  /** Sièges 0 et 2 (équipe A) = robots du propriétaire ; 1 et 3 (équipe B) = robots du challenger. */
  seatRobotIds: [string, string, string, string];
}

export interface CompetitionResult {
  gameId: string;
  winner: 'A' | 'B' | null;
  scoreTeamA: number;
  scoreTeamB: number;
}

/**
 * Exécute une partie de compétition ENTIÈREMENT en backend (aucun humain, aucun délai).
 * Joue jusqu'à la fin puis persiste via le pipeline standard (agrégat + replay + projection).
 */
export class CompetitionRunner {
  async run(params: {
    competitionId: string;
    ownerId: string;
    manches: number;
    lineup: CompetitionLineup;
  }): Promise<CompetitionResult> {
    const { ownerId, manches, lineup } = params;

    const robotDocuments = await RobotModel.find({ _id: { $in: lineup.seatRobotIds } }).lean();
    const robotById = new Map(robotDocuments.map((document: any) => [String(document._id), document]));

    const enginePlayers: EnginePlayer[] = lineup.seatRobotIds.map((robotId, seat) => {
      const robotDocument: any = robotById.get(robotId);
      return { seat: seat as Seat, name: robotDocument?.name ?? `Robot ${seat + 1}`, type: 'robot', robotId };
    });

    const engine = new GameEngine(
      enginePlayers,
      { ...DEFAULT_PARTIE, manches: ([1, 2, 4].includes(manches) ? manches : 2) as 1 | 2 | 4, local: false },
      contreeRules,
    );

    const logs: LogEntry[] = [];
    const robots: RobotConfig[] = lineup.seatRobotIds.map((robotId, seat) =>
      robotFromFiche(robotById.get(robotId) ?? {}, { id: robotId, name: `Robot ${seat + 1}` }),
    );
    const brains: RobotAlgorithm[] = robots.map((robot) =>
      createAlgorithm(robot, contreeRules, (entry) => { if (logs.length < 800) logs.push(entry); }),
    );

    // Boucle de jeu sans délai jusqu'à la fin de la partie.
    let steps = 0;
    while (engine.phase !== 'partie_end' && steps++ < MAX_STEPS) {
      if (engine.view().awaitingCollect) { engine.collectTrick(); continue; }
      if (engine.phase === 'donne_end') { engine.nextDonne(); continue; }
      if (engine.phase === 'manche_end') { engine.nextManche(); continue; }
      if (engine.phase === 'surcontre') {
        // Camp preneur (robots) : décision de surcoinche via le hook (false par défaut).
        for (const s of engine.view().surcontreSeats as Seat[]) {
          engine.submitBid(s, { action: shouldSurcontrer(robots[s], engine.view(), s) ? 'surcontree' : 'pass' });
        }
        continue;
      }
      const seat = engine.turn!;
      const action = robotAct(engine, seat, brains[seat]);
      if (action.kind === 'bid') {
        if (!engine.submitBid(seat, action.bid).ok) engine.submitBid(seat, { action: 'pass' });
      } else {
        engine.playCard(seat, action.card);
      }
    }

    const participants: PersistenceParticipant[] = lineup.seatRobotIds.map((robotId, seat) => ({
      seat: seat as Seat, type: 'robot', robotId,
    }));

    const { gameId, winner } = await gamePersistenceService.persistFinishedGame({
      engine, tableId: null, sessionId: null, ownerId, teamId: null,
      visibility: 'public', mode: 'competition', participants, logs, substituteSeats: new Set(),
    });

    const finalManche = engine.manches[engine.manches.length - 1];
    return { gameId, winner, scoreTeamA: finalManche.cumulative.A, scoreTeamB: finalManche.cumulative.B };
  }
}

export const competitionRunner = new CompetitionRunner();
