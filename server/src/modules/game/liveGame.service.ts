import type { Server } from 'socket.io';
import {
  ContreeRules, createAlgorithm, GameEngine, makeRobot, robotFromFiche, robotAct, shouldSurcontrer,
  resolveTableConfig,
  type EnginePlayer, type LogEntry, type RobotAlgorithm, type RobotConfig, type Seat,
} from 'belote-core';
import { TableModel } from '../table/table.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { SessionModel } from './session.model.js';
import { GameModel } from './game.model.js';
import { gamePersistenceService, type PersistenceParticipant } from './gamePersistence.service.js';
import { singleGameLockService } from './singleGameLock.service.js';
import { createLogger } from '../../core/logger.js';

const logger = createLogger('live-game');

const DEFAULT_TURN_TIMEOUT_MS = 10000;
const BID_RESPONSE_MS = 700;
const MANCHE_BREAK_MS = 5200;
const COLLECT_DELAY_MS = 1600;
const DONNE_BREAK_MS = 2500;
const MIN_PLAY_DELAY_MS = 300;
/**
 * v14.7 — Délai réduit entre les coups d'un siège humain déjà en mode
 * substitution. Évite que les autres joueurs attendent le turnTimeoutMs
 * entier (15s) à chaque tour d'un joueur absent.
 */
const SUBSTITUTE_TURN_DELAY_MS = 500;

interface LiveGame {
  engine: GameEngine;
  /** v17 — barème résolu de la table (utilisé pour instancier les cerveaux). */
  rules: ContreeRules;
  /** v18 — couleurs du thème de table (envoyées au client avec l'état). */
  themeColors: Record<string, string> | null;
  participants: PersistenceParticipant[];
  robotBrains: (RobotAlgorithm | null)[];
  robots: (RobotConfig | null)[];
  /** Remplaçant par défaut si aucun remplaçant spécifique n'est configuré. */
  substituteBrain: RobotAlgorithm;
  /**
   * v14.5 — Remplaçant SPÉCIFIQUE par siège humain (renseigné pour les tables
   * issues d'un Match compétition où chaque humain a désigné son propre robot
   * de secours). Si undefined pour un siège, on retombe sur substituteBrain.
   */
  substituteBrainBySeat: Map<number, RobotAlgorithm>;
  turnTimeoutMs: number;
  turnTimer: ReturnType<typeof setTimeout> | null;
  substituteSeats: Set<number>;
  logs: LogEntry[];
  ownerId: string;
  teamId: string | null;
  visibility: 'public' | 'private';
  kind: 'hybride' | 'acier' | 'royal';
  /** v14.11 — Origine de la table (user/match/tournament) pour marquer la Game persistée. */
  origin: 'user' | 'match' | 'tournament';
  sessionId: string;
  persisted: boolean;
  /** Piste enrichie (smileys, réflexions, notes) — persistée en fin de partie. */
  events?: { type: string; at: number; seat: number; data: unknown }[];
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

  /**
   * v14.5 — Configure le robot de secours SPÉCIFIQUE pour un siège humain.
   * Utilisé par matchLiveService pour utiliser le robot choisi par le joueur
   * lors de l'inscription au match, au lieu du remplaçant générique.
   *
   * À appeler APRÈS launch(). Si le siège n'est pas humain, la config est
   * ignorée.
   */
  async setSubstituteBrainForSeat(tableId: string, seat: number, robotId: string): Promise<boolean> {
    const live = this.games.get(tableId);
    if (!live) return false;
    const robotDoc: any = await RobotModel.findById(robotId).lean();
    if (!robotDoc) return false;
    const robotCfg = robotFromFiche(robotDoc, { id: String(robotDoc._id), name: robotDoc.name });
    const brain = createAlgorithm(robotCfg, live.rules);
    live.substituteBrainBySeat.set(seat, brain);
    return true;
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

    // v17 — TOUTE la configuration moteur (barème + orchestration) est
    // résolue en un point unique depuis la config de la table. C'est ici que
    // « score initial des enchères », « belote comptée ou non » et « sens du
    // jeu » deviennent effectifs.
    const cfg = tableDocument.config ?? {};
    const { rulesConfig, partieConfig } = resolveTableConfig({
      manches: cfg.manches,
      baseTarget: cfg.baseTarget,
      labelTarget: cfg.labelTarget,
      openingBidMin: cfg.openingBidMin,
      countBelote: cfg.countBelote,
      clockwise: cfg.clockwise,
      responseTimeMs: 1000,
      maxPlayTimeMs: 10000,
      local: false,
      signals: cfg.signals,
    });
    const contreeRules = new ContreeRules(rulesConfig);
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

    // v18 — thème de table (couleurs résolues) posé au provisionnement.
    const tc = (tableDocument.config?.themeColors ?? null) as any;
    const themeColors = tc && tc.felt1
      ? { felt1: tc.felt1, felt2: tc.felt2, rail: tc.rail, railHi: tc.railHi, railLo: tc.railLo, railInner: tc.railInner, accent: tc.accent, accent2: tc.accent2, backHi: tc.backHi, backLo: tc.backLo }
      : null;

    this.games.set(tableId, {
      engine,
      rules: contreeRules,
      themeColors,
      participants,
      robotBrains,
      robots,
      substituteBrain,
      substituteBrainBySeat: new Map(),
      turnTimeoutMs: tableDocument.config?.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS,
      turnTimer: null,
      substituteSeats: new Set(),
      logs,
      ownerId: String(tableDocument.owner),
      teamId: tableDocument.team ? String(tableDocument.team) : null,
      visibility: tableDocument.visibility === 'public' ? 'public' : 'private',
      kind: ['hybride', 'acier', 'royal'].includes(tableDocument.kind) ? tableDocument.kind : 'hybride',
      // v14.11 — Propager l'origine (user/match/tournament) pour mode Game.
      origin: ['user', 'match', 'tournament'].includes((tableDocument as any).origin) ? (tableDocument as any).origin : 'user',
      sessionId: String(sessionDocument._id),
      persisted: false,
    });
    logger.info('partie lancée', { table: tableId, manches: partieConfig.manches });
    this.advance(server, tableId);
  }

  /** Vrai si `userId` est ASSIS (joueur) à la table donnée. */
  hasSeat(tableId: string, userId?: string): boolean {
    const liveGame = this.games.get(tableId);
    if (!liveGame) return false;
    return this.seatOfUser(liveGame, userId) != null;
  }

  /**
   * Issue d'une partie déjà terminée sur cette table (pour informer un joueur
   * qui revient après la fin). Retrouve la dernière partie archivée de la table.
   */
  async finishedInfo(tableId: string): Promise<{ winner: 'A' | 'B' | null; gameId: string } | null> {
    const gameDocument: any = await GameModel.findOne({ table: tableId }).sort('-createdAt').select('_id winner').lean();
    if (!gameDocument) return null;
    return { winner: gameDocument.winner ?? null, gameId: String(gameDocument._id) };
  }

  /**
   * Enregistre un « signal » de partie (smiley, réflexion, note) émis par un
   * joueur assis, et le rebroadcaste au canal. Alimente la piste enrichie
   * du replay.
   */
  pushSignal(server: Server, tableId: string, userId: string, kind: string, data: unknown): void {
    const liveGame = this.games.get(tableId);
    if (!liveGame) return;
    const seat = this.seatOfUser(liveGame, userId);
    if (seat == null) return;
    const event = { type: kind, at: Date.now(), seat, data } as { type: string; at: number; seat: number; data: unknown };
    (liveGame.events ??= []).push(event);
    // Le client consomme `kind` (et `seat`, `data`). On envoie les deux clés
    // (`type` ET `kind`) pour rester compatible avec tout consommateur.
    server.to(`table:${tableId}`).emit('table:signal', { ...event, kind });
  }

  /**
   * REPRISE (SPEC §3.8) : quand un joueur revient dans une partie où son
   * robot substitut jouait à sa place, il reprend la main immédiatement —
   * le siège quitte l'ensemble des substituts et l'état lui est renvoyé.
   */
  /**
   * Un joueur assis QUITTE (désabonnement ou déconnexion) : on marque son siège
   * comme substitué pour que le robot prenne la main sans attendre le timeout.
   * S'il revient, resumeSeat() lui rend la main immédiatement.
   */
  markSeatLeft(server: Server, tableId: string, userId?: string): void {
    const liveGame = this.games.get(tableId);
    if (!liveGame || !userId) return;
    const seat = this.seatOfUser(liveGame, userId);
    if (seat == null) return;
    // Seuls les sièges HUMAINS sont substituables (un robot n'a pas à l'être).
    if (liveGame.participants[seat]?.type !== 'human') return;
    if (!liveGame.substituteSeats.has(seat)) {
      liveGame.substituteSeats.add(seat);
      liveGame.logs.push({ t: Date.now(), robotId: 'system', phase: 'live', level: 'info', msg: `Le joueur du siège ${seat} a quitté — robot substitut activé.` } as LogEntry);
      void this.broadcastState(server, tableId);
      // Si c'était à ce siège de jouer, relancer l'avancement (le robot joue).
      if (liveGame.engine.view().turn === seat) this.advance(server, tableId);
    }
  }

  resumeSeat(server: Server, tableId: string, userId?: string): void {
    const liveGame = this.games.get(tableId);
    if (!liveGame || !userId) return;
    const seat = this.seatOfUser(liveGame, userId);
    if (seat == null) return;
    if (liveGame.substituteSeats.has(seat)) {
      liveGame.substituteSeats.delete(seat);
      liveGame.logs.push({ t: Date.now(), robotId: 'system', phase: 'live', level: 'info', msg: `Le joueur du siège ${seat} a repris la main.` } as LogEntry);
      // Notifie les clients (le joueur concerné cache le bouton « Reprendre »).
      server.to(`table:${tableId}`).emit('table:reclaimed', { seat });
      void this.broadcastState(server, tableId);
    }
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
    const sockets = await server.in(`table:${tableId}`).fetchSockets();
    // SPEC §3.7 — un spectateur voit annonces / dernier pli / score / cartes JOUÉES,
    // smileys et réflexions, mais JAMAIS les mains des joueurs ou robots.
    // La vue moteur (`view`) contient déjà `currentTrick` et `lastTrick` ; on
    // n'envoie DÉLIBÉRÉMENT pas `hands` aux non-participants.
    // Nombre de cartes par siège (permet au client de dessiner le bon nombre
    // de DOS sans révéler les cartes) + noms des joueurs pour l'affichage.
    const handCounts = [0, 1, 2, 3].map((i) => engine.handOf(i as Seat).length);
    const playerNames = engine.players.map((p) => p.name);
    // Métadonnées des joueurs par siège (pour ouvrir un profil depuis la table).
    const players = liveGame.participants.map((participant, i) => ({
      seat: i, name: engine.players[i]?.name ?? `Siège ${i + 1}`,
      type: participant.type, userId: participant.userId ?? null,
    }));
    // Nombre de spectateurs = abonnés non assis. Diffusé pour l'affichage.
    const spectatorCount = sockets.filter((sock) => this.seatOfUser(liveGame, sock.data.userId) == null).length;
    server.to(`table:${tableId}`).emit('table:spectators', { count: spectatorCount });
    for (const socket of sockets) {
      const seat = this.seatOfUser(liveGame, socket.data.userId);
      // v18 — themeColors voyage AVEC l'état de jeu : c'est le seul canal reçu
      // par un joueur qui rejoint une table déjà en cours (le lobby n'est pas
      // renvoyé au subscribe), donc le thème s'applique dès la 1ʳᵉ frame.
      const commonView = { ...view, handCounts, playerNames, players, themeColors: liveGame.themeColors };
      if (seat != null) {
        socket.emit('table:game', { view: commonView, summary, myHand: engine.handOf(seat), legal: engine.legalCards(seat), mySeat: seat, logs: liveGame.logs.slice(-80) });
      } else {
        socket.emit('table:game', { view: commonView, summary, watcher: true, logs: liveGame.logs.slice(-80) });
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

    // Tour d'un humain. v14.7 : si le siège est DÉJÀ en substitution (le
    // robot joue à sa place depuis un tour précédent), on ne fait pas
    // attendre les autres joueurs le turnTimeoutMs entier — délai réduit à
    // 500 ms. Le joueur humain peut à tout moment cliquer « Reprendre la
    // main » côté client, qui appelle resumeSeat via table:reclaim.
    const alreadyInSubstitute = liveGame.substituteSeats.has(currentSeat);
    const delay = alreadyInSubstitute ? SUBSTITUTE_TURN_DELAY_MS : liveGame.turnTimeoutMs;

    liveGame.turnTimer = setTimeout(() => {
      const current = this.games.get(tableId);
      if (!current || current.engine.turn !== currentSeat) return;
      // Le joueur a peut-être repris la main pendant l'attente : dans ce cas
      // resumeSeat a vidé substituteSeats. On respecte sa reprise.
      if (!current.substituteSeats.has(currentSeat)) {
        // Première fois qu'on active la substitution → on notifie et on
        // marque le siège. Les tours suivants passeront direct par la
        // branche « alreadyInSubstitute ».
        current.substituteSeats.add(currentSeat);
        server.to(`table:${tableId}`).emit('table:substitute', { seat: currentSeat });
      }
      const brain = current.substituteBrainBySeat.get(currentSeat) ?? current.substituteBrain;
      const action = robotAct(current.engine, currentSeat, brain);
      if (action.kind === 'bid') { const result = current.engine.submitBid(currentSeat, action.bid); if (!result.ok) current.engine.submitBid(currentSeat, { action: 'pass' }); }
      else current.engine.playCard(currentSeat, action.card);
      this.advance(server, tableId);
    }, delay);
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

  /** Instantané des sessions de jeu actives — pour le moniteur wslogs (dev). */
  snapshotSessions(): Array<{ tableId: string; phase: string; turn: number | null; kind: string; visibility: string; players: { seat: number; name: string; isRobot: boolean; substitute: boolean }[]; scores: { A: number; B: number }; manchesWon: { A: number; B: number }; logs: number }> {
    const out: any[] = [];
    for (const [tableId, live] of this.games.entries()) {
      const view = live.engine.view();
      out.push({
        tableId,
        phase: view.phase,
        turn: view.turn,
        kind: live.kind,
        visibility: live.visibility,
        players: live.engine.players.map((p, i) => ({ seat: i, name: p.name, isRobot: p.type === 'robot', substitute: live.substituteSeats.has(i) })),
        // Points de la manche courante (peut repartir de 0 entre 2 manches).
        scores: view.cumulative,
        // v17 — manches gagnées (best-of-N) : score de progression MONOTONE.
        manchesWon: view.manchesWon,
        logs: live.logs.length,
      });
    }
    return out;
  }

  resendState(server: Server, tableId: string) {
    if (this.games.has(tableId)) this.broadcastState(server, tableId);
  }

  /**
   * Recompte les spectateurs (sockets du canal non assis) et diffuse le nombre.
   * `excludeSocketId` permet d'ignorer un socket en cours de départ (dont la
   * sortie du canal n'est pas encore effective au moment de l'appel).
   */
  async broadcastSpectatorCount(server: Server, tableId: string, excludeSocketId?: string) {
    if (!this.games.has(tableId)) return;
    const sockets = await server.in(`table:${tableId}`).fetchSockets();
    const count = sockets.filter((sock) => sock.id !== excludeSocketId && this.seatOfUser(this.games.get(tableId)!, sock.data.userId) == null).length;
    server.to(`table:${tableId}`).emit('table:spectators', { count });
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
      kind: liveGame.kind,
      // v14.11 — Tables issues d'un match ou d'un tournoi → mode competition,
      // sinon online (partie libre). Utilisé par l'historique pour filtrer.
      mode: (liveGame.origin === 'match' || liveGame.origin === 'tournament') ? 'competition' : 'online',
      participants: liveGame.participants,
      logs: liveGame.logs.slice(-500),
      substituteSeats: liveGame.substituteSeats,
      events: liveGame.events ?? [],
    });

    await TableModel.findByIdAndUpdate(tableId, { $set: { status: 'finished', activeSession: sessionId } });
    // IMPORTANT : libérer le verrou de partie unique de TOUS les joueurs. Le
    // verrou stocke l'ID de TABLE — sans ça, la bannière « Partie en cours »
    // resterait affichée et les robots seraient vus comme toujours occupés.
    await singleGameLockService.releaseAllOf(tableId);
    server.to(`table:${tableId}`).emit('table:finished', { gameId, winner });
    server.emit('tables:changed');
    this.games.delete(tableId);
  }
}

export const liveGameService = new LiveGameService();
