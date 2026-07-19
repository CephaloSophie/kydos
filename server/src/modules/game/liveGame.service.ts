import type { Server } from 'socket.io';
import {
  ContreeRules, createAlgorithm, GameEngine, makeRobot, robotFromFiche, robotAct, shouldSurcontrer,
  type EnginePlayer, type LogEntry, type PartieConfig, type RobotAlgorithm, type RobotConfig, type Seat,
} from 'belote-core';
import { TableModel } from '../table/table.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { SessionModel } from './session.model.js';
import { gamePersistenceService, type PersistenceParticipant } from './gamePersistence.service.js';
import { createLogger } from '../../core/logger.js';

const logger = createLogger('live-game');
const contreeRules = new ContreeRules();

const DEFAULT_TURN_TIMEOUT_MS = 10000;
const BID_RESPONSE_MS = 700;
const MANCHE_BREAK_MS = 5200;
const COLLECT_DELAY_MS = 1600;
const DONNE_BREAK_MS = 2500;
const MIN_PLAY_DELAY_MS = 300;

interface LiveGame {
  engine: GameEngine;
  participants: PersistenceParticipant[];
  robotBrains: (RobotAlgorithm | null)[];
  robots: (RobotConfig | null)[];
  substituteBrain: RobotAlgorithm;
  turnTimeoutMs: number;
  turnTimer: ReturnType<typeof setTimeout> | null;
  substituteSeats: Set<number>;
  logs: LogEntry[];
  ownerId: string;
  teamId: string | null;
  visibility: 'public' | 'private';
  sessionId: string;
  persisted: boolean;
}

/**
 * Service du MOTEUR LIVE : une Table démarre une Session de jeu, pilotée par
 * WebSocket. Diffuse l'état sur le canal `table:{id}`, gère robot de secours,
 * fenêtre de surcoinche, et délègue la persistance (agrégat + projection) en fin de partie.
 */
export class LiveGameService {
  private games = new Map<string, LiveGame>();

  isLive(tableId: string): boolean {
    return this.games.has(tableId);
  }

  async launch(server: Server, tableId: string): Promise<void> {
    if (this.games.has(tableId)) return;
    const tableDocument: any = await TableModel.findById(tableId);
    if (!tableDocument || tableDocument.seats.some((seat: any) => seat.kind === 'empty')) return;

    const participants: PersistenceParticipant[] = tableDocument.seats.map((seat: any, index: number) => ({
      seat: index as Seat,
      type: seat.kind === 'robot' ? 'robot' : 'human',
      userId: seat.user ? String(seat.user) : undefined,
      robotId: seat.robot ? String(seat.robot) : undefined,
    }));

    const enginePlayers: EnginePlayer[] = participants.map((participant, index) => ({
      seat: index as Seat,
      name: tableDocument.seats[index].name,
      type: participant.type,
      userId: participant.userId,
      robotId: participant.robotId,
    }));

    const partieConfig: PartieConfig = {
      manches: [1, 2, 4].includes(tableDocument.config?.manches) ? tableDocument.config.manches : 2,
      baseTarget: 1500, labelTarget: 2000, responseTimeMs: 1000, maxPlayTimeMs: 10000,
      clockwise: false, local: false,
      signals: {
        reflexion: tableDocument.config?.signals?.reflexion !== false,
        repeatSuit: tableDocument.config?.signals?.repeatSuit !== false,
      },
    };
    const engine = new GameEngine(enginePlayers, partieConfig, contreeRules);

    const robotIds = tableDocument.seats.filter((seat: any) => seat.robot).map((seat: any) => seat.robot);
    const robotDocuments = await RobotModel.find({ _id: { $in: robotIds } }).lean();
    const robotById = new Map(robotDocuments.map((document: any) => [String(document._id), document]));
    const logs: LogEntry[] = [];

    const robots = tableDocument.seats.map((seat: any) => {
      if (seat.kind !== 'robot') return null;
      const robotDocument: any = robotById.get(String(seat.robot));
      return robotFromFiche(robotDocument ?? {}, { id: String(seat.robot), name: seat.name });
    });
    const robotBrains = robots.map((robot: RobotConfig | null) =>
      robot ? createAlgorithm(robot, contreeRules, (entry) => { logs.push(entry); if (logs.length > 500) logs.shift(); }) : null,
    );

    const substituteBrain = createAlgorithm(makeRobot({ id: 'auto', name: 'Auto', personality: { aggressiveness: 5, concentration: 5, velocity: 5 } }), contreeRules);

    // Session = exécution live de la table (cycle de vie propre, ouverte ici, close à la persistance).
    const sessionDocument = await SessionModel.create({ table: tableId, status: 'running' });
    await TableModel.findByIdAndUpdate(tableId, { $set: { activeSession: sessionDocument._id } });

    this.games.set(tableId, {
      engine,
      participants,
      robotBrains,
      robots,
      substituteBrain,
      turnTimeoutMs: tableDocument.config?.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS,
      turnTimer: null,
      substituteSeats: new Set(),
      logs,
      ownerId: String(tableDocument.owner),
      teamId: tableDocument.team ? String(tableDocument.team) : null,
      visibility: tableDocument.visibility === 'public' ? 'public' : 'private',
      sessionId: String(sessionDocument._id),
      persisted: false,
    });
    logger.info('partie lancée', { table: tableId, manches: partieConfig.manches });
    this.advance(server, tableId);
  }

  private seatOfUser(liveGame: LiveGame, userId?: string): Seat | null {
    if (!userId) return null;
    const index = liveGame.participants.findIndex((participant) => participant.userId === userId);
    return index >= 0 ? (index as Seat) : null;
  }

  private clearTurnTimer(liveGame: LiveGame) {
    if (liveGame.turnTimer) { clearTimeout(liveGame.turnTimer); liveGame.turnTimer = null; }
  }

  private async broadcastState(server: Server, tableId: string) {
    const liveGame = this.games.get(tableId);
    if (!liveGame) return;
    const engine = liveGame.engine;
    const view = engine.view();
    const summary = engine.summary();
    const allHands = [0, 1, 2, 3].map((index) => engine.handOf(index as Seat));
    const sockets = await server.in(`table:${tableId}`).fetchSockets();
    for (const socket of sockets) {
      const seat = this.seatOfUser(liveGame, socket.data.userId);
      if (seat != null) {
        socket.emit('table:game', { view, summary, myHand: engine.handOf(seat), legal: engine.legalCards(seat), mySeat: seat, logs: liveGame.logs.slice(-80) });
      } else {
        socket.emit('table:game', { view, summary, hands: allHands, watcher: true, logs: liveGame.logs.slice(-80) });
      }
    }
  }

  private advance(server: Server, tableId: string) {
    const liveGame = this.games.get(tableId);
    if (!liveGame) return;
    const engine = liveGame.engine;
    this.clearTurnTimer(liveGame);
    this.broadcastState(server, tableId);

    if (engine.phase === 'partie_end') { void this.persist(server, tableId); return; }
    if (engine.view().awaitingCollect) { setTimeout(() => { engine.collectTrick(); this.advance(server, tableId); }, COLLECT_DELAY_MS); return; }
    if (engine.phase === 'donne_end') { setTimeout(() => { engine.nextDonne(); this.advance(server, tableId); }, DONNE_BREAK_MS); return; }
    if (engine.phase === 'manche_end') { setTimeout(() => { engine.nextManche(); this.advance(server, tableId); }, MANCHE_BREAK_MS); return; }

    // Micro-phase SURCONTRE : seul le camp preneur décide (pass/surcontre).
    // Robots → décision immédiate via le hook. Humains → popup + chrono = turnTimeoutMs (par siège,
    // démarrés ensemble) ; à l'expiration, pass automatique. Un surcontre clôt pour les deux.
    if (engine.phase === 'surcontre') {
      const pending = engine.view().surcontreSeats as Seat[];
      const robotSeat = pending.find((s) => liveGame.robots[s]);
      if (robotSeat != null) {
        const decide = shouldSurcontrer(liveGame.robots[robotSeat]!, engine.view(), robotSeat);
        setTimeout(() => {
          const current = this.games.get(tableId);
          if (!current || current.engine.phase !== 'surcontre') return;
          current.engine.submitBid(robotSeat, { action: decide ? 'surcontree' : 'pass' });
          this.advance(server, tableId);
        }, BID_RESPONSE_MS);
        return;
      }
      // Tous les sièges en attente sont humains : on leur affiche la popup et on arme le chrono.
      server.to(`table:${tableId}`).emit('table:surcontre', { seats: pending, windowMs: liveGame.turnTimeoutMs });
      liveGame.turnTimer = setTimeout(() => {
        const current = this.games.get(tableId);
        if (!current || current.engine.phase !== 'surcontre') return;
        for (const s of current.engine.view().surcontreSeats as Seat[]) current.engine.submitBid(s, { action: 'pass' });
        this.advance(server, tableId);
      }, liveGame.turnTimeoutMs);
      return;
    }

    const currentSeat = engine.turn!;
    const robotBrain = liveGame.robotBrains[currentSeat];
    if (robotBrain) {
      const action = robotAct(engine, currentSeat, robotBrain);
      const delay = action.kind === 'bid' ? BID_RESPONSE_MS : Math.max(MIN_PLAY_DELAY_MS, action.thinkMs);
      setTimeout(() => {
        if (action.kind === 'bid') { const result = engine.submitBid(currentSeat, action.bid); if (!result.ok) engine.submitBid(currentSeat, { action: 'pass' }); }
        else engine.playCard(currentSeat, action.card);
        this.advance(server, tableId);
      }, delay);
      return;
    }

    // Tour d'un humain : robot de secours après turnTimeoutMs.
    liveGame.turnTimer = setTimeout(() => {
      const current = this.games.get(tableId);
      if (!current || current.engine.turn !== currentSeat) return;
      current.substituteSeats.add(currentSeat);
      server.to(`table:${tableId}`).emit('table:substitute', { seat: currentSeat });
      const action = robotAct(current.engine, currentSeat, current.substituteBrain);
      if (action.kind === 'bid') { const result = current.engine.submitBid(currentSeat, action.bid); if (!result.ok) current.engine.submitBid(currentSeat, { action: 'pass' }); }
      else current.engine.playCard(currentSeat, action.card);
      this.advance(server, tableId);
    }, liveGame.turnTimeoutMs);
  }

  submitBid(server: Server, userId: string, tableId: string, bid: any) {
    const liveGame = this.games.get(tableId);
    if (!liveGame) return;
    const seat = this.seatOfUser(liveGame, userId);
    if (seat == null) return;
    const isCounterAction = bid?.action === 'contree' || bid?.action === 'surcontree';
    if (!isCounterAction && (liveGame.engine.turn !== seat || liveGame.engine.phase !== 'bidding')) return;
    this.clearTurnTimer(liveGame);
    if (!liveGame.engine.submitBid(seat, bid).ok) return;
    this.advance(server, tableId);
  }

  playCard(server: Server, userId: string, tableId: string, card: any) {
    const liveGame = this.games.get(tableId);
    if (!liveGame) return;
    const seat = this.seatOfUser(liveGame, userId);
    if (seat == null || liveGame.engine.turn !== seat || liveGame.engine.phase !== 'playing') return;
    this.clearTurnTimer(liveGame);
    if (!liveGame.engine.playCard(seat, card).ok) return;
    this.advance(server, tableId);
  }

  resendState(server: Server, tableId: string) {
    if (this.games.has(tableId)) this.broadcastState(server, tableId);
  }

  private async persist(server: Server, tableId: string) {
    const liveGame = this.games.get(tableId);
    if (!liveGame || liveGame.persisted) return;
    liveGame.persisted = true;

    const { gameId, sessionId, winner } = await gamePersistenceService.persistFinishedGame({
      engine: liveGame.engine,
      tableId,
      sessionId: liveGame.sessionId,
      ownerId: liveGame.ownerId,
      teamId: liveGame.teamId,
      visibility: liveGame.visibility,
      participants: liveGame.participants,
      logs: liveGame.logs.slice(-500),
      substituteSeats: liveGame.substituteSeats,
    });

    await TableModel.findByIdAndUpdate(tableId, { $set: { status: 'finished', activeSession: sessionId } });
    server.to(`table:${tableId}`).emit('table:finished', { gameId, winner });
    server.emit('tables:changed');
    this.games.delete(tableId);
  }
}

export const liveGameService = new LiveGameService();
