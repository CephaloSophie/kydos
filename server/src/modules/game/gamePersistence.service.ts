import mongoose from 'mongoose';
import { computeGameStats, computeScoreGain, gameTypeCoefficient, levelForScore, type GameEngine, type GameKind, type Seat } from 'belote-core';
import { deriveExtraStats, replayDurationMs } from './gameTracking.js';
import { scoreConfigService, classifyGameCategory } from '../scoreConfig/scoreConfig.service.js';
import { GameModel } from './game.model.js';
import { GameReplayModel } from './gameReplay.model.js';
import { SessionModel } from './session.model.js';
import { UserModel } from '../user/user.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { walletService } from '../wallet/wallet.service.js';
import { payoutsByUser, type GameEconomyContext, type SeatEconomy } from '../../shared/gameEconomy.js';
import { singleGameLockService } from './singleGameLock.service.js';
import { eventBus, DomainEvents, type GameFinishedPayload } from '../../core/eventBus.js';
import { createLogger } from '../../core/logger.js';

const logger = createLogger('game-persistence');

export interface PersistenceParticipant {
  seat: Seat;
  type: 'human' | 'robot';
  userId?: string;
  robotId?: string;
}

const teamLetterOfSeat = (seat: number): 'A' | 'B' => (seat % 2 === 0 ? 'A' : 'B');

/**
 * Persistance d'une partie terminée — agrégat unique + replay froid séparé.
 *  1. Pré-allocation de l'_id partagé (Game et GameReplay le partagent → 1:1).
 *  2. Écriture du REPLAY froid d'abord (gros blob), dans sa collection.
 *  3. Écriture de l'AGRÉGAT Game ensuite = POINT DE COMMIT (un Game ⇒ son replay existe).
 *  4. Clôture de la Session ; récompenses des humains.
 *  5. Publication de `game.finished` (non bloquant) → la projection CQRS se fait hors chemin
 *     critique, sans couplage direct au module analytics.
 */
export class GamePersistenceService {
  async persistFinishedGame(params: {
    engine: GameEngine;
    tableId: string | null;
    sessionId: string | null;
    ownerId: string;
    teamId: string | null;
    visibility: 'public' | 'private';
    mode?: 'local' | 'online' | 'competition';
    kind?: 'hybride' | 'acier' | 'royal' | 'local';
    // v18 — rattachement compétition (pour l'agrégation back-office par variante).
    match?: string | null;
    formatConfig?: string | null;
    tournament?: string | null;
    participants: PersistenceParticipant[];
    logs: unknown[];
    substituteSeats: Set<number>;
    /** Piste enrichie (smileys, réflexions...) — SPEC §3.10. */
    events?: { type: string; at: number; seat: number; data: unknown }[];
    /**
     * v19 — Coefficient de SCORE de la partie/tournoi (défaut 1). Multiplie le
     * score Kýdos gagné par les vainqueurs (voir belote-core `scoreKydos`).
     */
    scoreCoefficient?: number;
  }) {
    const { engine, tableId, sessionId, ownerId, teamId, visibility, participants, logs, substituteSeats } = params;
    const winner = engine.partieWinner ?? null;
    const summary = engine.summary();
    const gameId = new mongoose.Types.ObjectId();

    // 1+2. Replay froid d'abord (même _id que le Game).
    // Noms publics pour la recherche par joueur/robot (SPEC §3.10) — les VRAIS
    // noms lisibles (username / nom du robot), pas les identifiants.
    const humanIds = participants.filter((p) => p.type === 'human' && p.userId).map((p) => p.userId!);
    const robotIdsForNames = participants.filter((p) => p.type === 'robot' && p.robotId).map((p) => p.robotId!);
    const [humanDocs, robotDocs] = await Promise.all([
      humanIds.length ? UserModel.find({ _id: { $in: humanIds } }).select('username').lean() : [],
      robotIdsForNames.length ? RobotModel.find({ _id: { $in: robotIdsForNames } }).select('name').lean() : [],
    ]);
    const nameByUser = new Map((humanDocs as any[]).map((u) => [String(u._id), u.username]));
    const nameByRobot = new Map((robotDocs as any[]).map((r) => [String(r._id), r.name]));
    const publicNames = participants
      .map((p) => (p.type === 'human' ? nameByUser.get(p.userId ?? '') : nameByRobot.get(p.robotId ?? '')))
      .filter(Boolean) as string[];
    await GameReplayModel.create({
      _id: gameId, game: gameId, replay: engine.toReplay(), logs,
      events: params.events ?? [], publicNames,
    });

    // Participants & manches embarqués (résumé pour listing/affichage).
    const embeddedParticipants = participants.map((participant) => ({
      seatIndex: participant.seat,
      team: teamLetterOfSeat(participant.seat),
      type: participant.type,
      user: participant.userId ?? null,
      robot: participant.robotId ?? null,
      name: participant.type === 'human' ? (nameByUser.get(participant.userId ?? '') ?? '') : (nameByRobot.get(participant.robotId ?? '') ?? ''),
      wasSubstitute: substituteSeats.has(participant.seat),
    }));
    const embeddedManches = summary.manches.map((manche) => ({
      number: manche.index,
      target: manche.target,
      winner: manche.winner ?? null,
      scoreTeamA: manche.cumulative.A,
      scoreTeamB: manche.cumulative.B,
    }));

    // Statistiques détaillées dérivées du replay (SPEC §3.10).
    const replay = engine.toReplay();
    const stats = computeGameStats(replay);
    // v18 — métriques enrichies (contrats tenus/chutés, moyenne, plis, durée).
    const extra = deriveExtraStats(stats.donnes);
    const durationMs = replayDurationMs(replay);

    // 3. Agrégat Game = point de commit.
    const gameDocument = await GameModel.create({
      _id: gameId,
      table: tableId,
      session: sessionId,
      owner: ownerId,
      team: teamId,
      visibility,
      mode: params.mode ?? 'online',
      kind: params.kind ?? 'local',
      // v18 — rattachement compétition.
      match: params.match ?? null,
      formatConfig: params.formatConfig ?? null,
      tournament: params.tournament ?? null,
      target: engine.view().target,
      winner,
      durationMs,
      participants: embeddedParticipants,
      manches: embeddedManches,
      finalScoreA: stats.finalScore.A,
      finalScoreB: stats.finalScore.B,
      manchesWonA: stats.manchesWon.A,
      manchesWonB: stats.manchesWon.B,
      stats: {
        totalDonnes: stats.totalDonnes,
        totalTricksA: stats.totalTricks.A,
        totalTricksB: stats.totalTricks.B,
        contres: stats.contres.total,
        surcontres: stats.contres.surcontres,
        contresReussies: stats.contresReussies,
        capotsA: stats.capots.A, capotsB: stats.capots.B, capotsTotal: stats.capots.total,
        capotsAnnoncesA: stats.capotsAnnonces.A, capotsAnnoncesB: stats.capotsAnnonces.B, capotsAnnoncesTotal: stats.capotsAnnonces.total,
        belotesA: stats.belotes.A, belotesB: stats.belotes.B,
        // v18 — métriques enrichies.
        totalTricks: extra.totalTricks,
        contractsMade: extra.contractsMade,
        contractsFailed: extra.contractsFailed,
        avgContract: extra.avgContract,
      },
      projection: { status: 'pending', version: 0, at: null },
    });

    // 4. Session + comptage des parties jouées (tous les humains).
    if (sessionId) {
      await SessionModel.findByIdAndUpdate(sessionId, { $set: { game: gameDocument._id, status: 'finished', finishedAt: new Date() } });
    }
    for (const participant of participants) {
      if (participant.type === 'human' && participant.userId) {
        await UserModel.findByIdAndUpdate(participant.userId, { $inc: { gamesPlayed: 1 } });
      }
    }

    // 4bis. ÉCONOMIE — versement des gains selon le mode (SPEC §3.9).
    //   Local (entraînement) : gratuit.
    //   Online / Compétition : payouts calculés par `payoutsByUser`.
    // On capture aussi les jetons gagnés par joueur (bonus de score éventuel).
    const payouts = new Map<string, number>();
    if (params.mode !== 'local') {
      // Résolution des propriétaires de robots pour le calcul des gains.
      const robotIds = participants.filter((p) => p.type === 'robot' && p.robotId).map((p) => p.robotId!) as string[];
      const robots = robotIds.length ? await RobotModel.find({ _id: { $in: robotIds } }).select('owner').lean() : [];
      const ownerByRobot = new Map<string, string>();
      for (const r of robots as any[]) ownerByRobot.set(String(r._id), String(r.owner));

      const seatsEconomy: SeatEconomy[] = participants.map((p) => ({
        kind: p.type,
        team: teamLetterOfSeat(p.seat),
        ownerUserId: p.type === 'human' ? p.userId : undefined,
        robotOwnerUserId: p.type === 'robot' && p.robotId ? ownerByRobot.get(p.robotId) : undefined,
      }));
      const ctx: GameEconomyContext = { mode: params.mode ?? 'online', seats: seatsEconomy, winner };
      for (const [userId, amount] of payoutsByUser(ctx).entries()) {
        payouts.set(userId, amount);
        try { await walletService.credit(userId, amount, String(gameDocument._id), 'game_win'); }
        catch (error) { logger.warn('échec versement gain', { userId, amount, error: String(error) }); }
      }
    }

    // 4ter. SCORE KÝDOS — modèle UNIQUE (barème de gain + échelle de niveaux),
    // appliqué aux VAINQUEURS, joueurs ET robots. Aucun score en entraînement.
    if (params.mode !== 'local' && winner) {
      await this.awardKydosScores({ participants, winner, gameKind: params.kind, mode: params.mode, teamId, tournament: params.tournament ?? null, scoreCoefficient: params.scoreCoefficient ?? 1, payouts });
    }

    // Libération du verrou « une partie à la fois » pour tous les participants (SPEC §3.8).
    if (sessionId) await singleGameLockService.releaseAllOf(String(sessionId));

    // 5. Événement de domaine → projection asynchrone, découplée.
    eventBus.publish<GameFinishedPayload>(DomainEvents.GameFinished, { gameId: String(gameDocument._id) });

    logger.info('partie persistée (agrégat + replay froid)', { game: String(gameDocument._id), manches: embeddedManches.length, winner });
    return { gameId: String(gameDocument._id), sessionId, winner };
  }

  /**
   * Crédite le SCORE Kýdos aux vainqueurs via le modèle UNIQUE (belote-core
   * `scoreKydos`). Pour chaque siège gagnant :
   *   gain = base(joueur|robot) × coefPartie × coefTypeJeu (+ bonus jetons)
   * On incrémente le score cumulé (User.rewardPoints / Robot.score) puis on
   * dérive et rafraîchit `level` + `scoreInLevel` avec l'échelle de niveaux.
   * Chaque écriture est isolée (un échec sur un siège n'empêche pas les autres).
   */
  private async awardKydosScores(ctx: {
    participants: PersistenceParticipant[];
    winner: 'A' | 'B';
    gameKind?: 'hybride' | 'acier' | 'royal' | 'local';
    mode?: 'local' | 'online' | 'competition';
    teamId: string | null;
    tournament: string | null;
    scoreCoefficient: number;
    payouts: Map<string, number>;
  }): Promise<void> {
    const config = await scoreConfigService.get();
    const humanCount = ctx.participants.filter((p) => p.type === 'human').length;
    const category = classifyGameCategory({
      tournament: !!ctx.tournament,
      competition: ctx.mode === 'competition',
      team: !!ctx.teamId,
      humanCount,
    });
    const kind: GameKind = ctx.gameKind === 'acier' || ctx.gameKind === 'royal' ? ctx.gameKind : 'hybride';
    const partieCoef = ctx.scoreCoefficient;
    const typeCoef = gameTypeCoefficient(config, category, kind);

    // Statut VIP des joueurs humains gagnants (bonus vipRate appliqué au score).
    const winnerUserIds = ctx.participants
      .filter((p) => p.type === 'human' && p.userId && teamLetterOfSeat(p.seat) === ctx.winner)
      .map((p) => p.userId!) as string[];
    const vipUserIds = new Set<string>();
    if (winnerUserIds.length) {
      const now = Date.now();
      const rows: any[] = await UserModel.find({ _id: { $in: winnerUserIds } }).select('vipExpiresAt').lean();
      for (const r of rows) {
        const exp = r.vipExpiresAt ? new Date(r.vipExpiresAt).getTime() : 0;
        if (exp > now) vipUserIds.add(String(r._id));
      }
    }

    // Recalcule et fige le niveau à partir d'un score total (source unique).
    const levelFields = (total: number) => {
      const p = levelForScore(config, total);
      return { level: p.level, scoreInLevel: p.pointsInLevel };
    };

    for (const participant of ctx.participants) {
      if (teamLetterOfSeat(participant.seat) !== ctx.winner) continue;
      try {
        if (participant.type === 'human' && participant.userId) {
          const gain = computeScoreGain(config, {
            isRobot: false, partieCoefficient: partieCoef, gameTypeCoefficient: typeCoef,
            tokensAccumulated: ctx.payouts.get(participant.userId) ?? 0,
            isVip: vipUserIds.has(participant.userId),
          });
          if (gain.total <= 0) continue;
          const doc: any = await UserModel.findByIdAndUpdate(participant.userId, { $inc: { rewardPoints: gain.total } }, { new: true }).select('rewardPoints');
          if (doc) await UserModel.updateOne({ _id: participant.userId }, { $set: levelFields(doc.rewardPoints ?? 0) });
        } else if (participant.type === 'robot' && participant.robotId) {
          const gain = computeScoreGain(config, {
            isRobot: true, partieCoefficient: partieCoef, gameTypeCoefficient: typeCoef,
          });
          if (gain.total <= 0) continue;
          const doc: any = await RobotModel.findByIdAndUpdate(participant.robotId, { $inc: { score: gain.total } }, { new: true }).select('score');
          if (doc) await RobotModel.updateOne({ _id: participant.robotId }, { $set: levelFields(doc.score ?? 0) });
        }
      } catch (error) {
        logger.warn('échec attribution score Kýdos', { seat: participant.seat, error: String(error) });
      }
    }
  }
}

export const gamePersistenceService = new GamePersistenceService();
