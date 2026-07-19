import mongoose from 'mongoose';
import { computeReward, type GameEngine, type Seat } from 'belote-core';
import { GameModel } from './game.model.js';
import { GameReplayModel } from './gameReplay.model.js';
import { SessionModel } from './session.model.js';
import { UserModel } from '../user/user.model.js';
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
    participants: PersistenceParticipant[];
    logs: unknown[];
    substituteSeats: Set<number>;
  }) {
    const { engine, tableId, sessionId, ownerId, teamId, visibility, participants, logs, substituteSeats } = params;
    const winner = engine.partieWinner ?? null;
    const summary = engine.summary();
    const gameId = new mongoose.Types.ObjectId();

    // 1+2. Replay froid d'abord (même _id que le Game).
    await GameReplayModel.create({ _id: gameId, game: gameId, replay: engine.toReplay(), logs });

    // Participants & manches embarqués (résumé pour listing/affichage).
    const embeddedParticipants = participants.map((participant) => ({
      seatIndex: participant.seat,
      team: teamLetterOfSeat(participant.seat),
      type: participant.type,
      user: participant.userId ?? null,
      robot: participant.robotId ?? null,
      name: '',
      wasSubstitute: substituteSeats.has(participant.seat),
    }));
    const embeddedManches = summary.manches.map((manche) => ({
      number: manche.index,
      target: manche.target,
      winner: manche.winner ?? null,
      scoreTeamA: manche.cumulative.A,
      scoreTeamB: manche.cumulative.B,
    }));

    // 3. Agrégat Game = point de commit.
    const gameDocument = await GameModel.create({
      _id: gameId,
      table: tableId,
      session: sessionId,
      owner: ownerId,
      team: teamId,
      visibility,
      mode: params.mode ?? 'online',
      target: engine.view().target,
      winner,
      participants: embeddedParticipants,
      manches: embeddedManches,
      projection: { status: 'pending', version: 0, at: null },
    });

    // 4. Session + récompenses.
    if (sessionId) {
      await SessionModel.findByIdAndUpdate(sessionId, { $set: { game: gameDocument._id, status: 'finished', finishedAt: new Date() } });
    }
    const finalManche = engine.manches[engine.manches.length - 1];
    for (const participant of participants) {
      if (participant.type !== 'human' || !participant.userId) continue;
      const teamLetter = teamLetterOfSeat(participant.seat);
      const opponentLetter = teamLetter === 'A' ? 'B' : 'A';
      const reward = computeReward({
        myScore: finalManche.cumulative[teamLetter],
        oppScore: finalManche.cumulative[opponentLetter],
        wonManche: finalManche.winner === teamLetter,
        mancheTarget: finalManche.target as 1500 | 2000,
        wonPartie: winner === teamLetter,
        partieManches: engine.manches.length as 1 | 2 | 4,
        advDedans: 0, capotsDeclaresRealises: 0, contreesGagnees: 0, surcontreesGagnees: 0, local: false,
      });
      await UserModel.findByIdAndUpdate(participant.userId, { $inc: { rewardPoints: reward.total, gamesPlayed: 1 } });
    }

    // 5. Événement de domaine → projection asynchrone, découplée.
    eventBus.publish<GameFinishedPayload>(DomainEvents.GameFinished, { gameId: String(gameDocument._id) });

    logger.info('partie persistée (agrégat + replay froid)', { game: String(gameDocument._id), manches: embeddedManches.length, winner });
    return { gameId: String(gameDocument._id), sessionId, winner };
  }
}

export const gamePersistenceService = new GamePersistenceService();
