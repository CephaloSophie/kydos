import mongoose from 'mongoose';
import { GameModel } from './game.model.js';
import { GameReplayModel } from './gameReplay.model.js';
import { UserModel } from '../user/user.model.js';
import { TeamModel } from '../team/team.model.js';
import { eventBus, DomainEvents, type GameFinishedPayload } from '../../core/eventBus.js';
import { badRequest, forbidden, notFound } from '../../core/HttpError.js';

const teamLetterOfSeat = (seat: number): 'A' | 'B' => (seat % 2 === 0 ? 'A' : 'B');

export class GameQueryService {
  async listForUser(userId: string, scope: string) {
    const userDocument = await UserModel.findById(userId).select('team');
    let filter: any;
    if (scope === 'public') filter = { visibility: 'public' };
    else if (scope === 'team') filter = userDocument?.team ? { team: userDocument.team } : { _id: null };
    else filter = { $or: [{ owner: userId }, { 'participants.user': userId }] };

    const gameDocuments = await GameModel.find(filter).sort('-createdAt').limit(50).lean();
    return gameDocuments.map((gameDocument: any) => ({
      id: String(gameDocument._id),
      mode: gameDocument.mode,
      visibility: gameDocument.visibility,
      kind: gameDocument.kind ?? 'local',
      winner: gameDocument.winner,
      target: gameDocument.target,
      manches: gameDocument.manches,
      createdAt: gameDocument.createdAt,
    }));
  }

  async getById(gameId: string, userId: string) {
    const gameDocument: any = await GameModel.findById(gameId).lean();
    if (!gameDocument) throw notFound();
    const userDocument = await UserModel.findById(userId).select('team');
    const isOwner = String(gameDocument.owner) === userId;
    const isSameTeam = gameDocument.team && userDocument?.team && String(gameDocument.team) === String(userDocument.team);
    if (!(gameDocument.visibility === 'public' || isOwner || isSameTeam)) throw forbidden('partie privée');
    // Rejeu : on charge le replay froid à la demande et on le rattache (compat client).
    const replayDocument: any = await GameReplayModel.findById(gameId).lean();
    return { ...gameDocument, replay: replayDocument?.replay ?? null, logs: replayDocument?.logs ?? [] };
  }

  /**
   * Recherche PUBLIQUE de parties par nom de joueur ou de robot (SPEC §3.10).
   * S'appuie sur GameReplay.publicNames (indexé) ; ne renvoie que les parties
   * en visibilité `public`.
   */
  async listPublicByName(query: string) {
    const q = (query ?? '').trim();
    if (!q) return [];
    const replayDocs: any[] = await GameReplayModel.find({ publicNames: { $regex: q, $options: 'i' } })
      .select('_id').sort('-createdAt').limit(50).lean();
    if (!replayDocs.length) return [];
    const ids = replayDocs.map((d) => d._id);
    const gameDocuments: any[] = await GameModel.find({ _id: { $in: ids }, visibility: 'public' }).sort('-createdAt').lean();
    return gameDocuments.map((gameDocument) => ({
      id: String(gameDocument._id),
      mode: gameDocument.mode,
      winner: gameDocument.winner,
      createdAt: gameDocument.createdAt,
      participants: (gameDocument.participants ?? []).map((p: any) => ({ name: p.name, type: p.type, team: p.team })),
    }));
  }

  async saveLocalGame(userId: string, data: any) {
    if (!data.replay) throw badRequest('replay requis');
    const userDocument = await UserModel.findById(userId).select('team');
    let visibility: 'public' | 'private' = 'private';
    let teamId: any = null;
    if (userDocument?.team) {
      const teamDocument: any = await TeamModel.findById(userDocument.team).select('visibility').lean();
      teamId = userDocument.team;
      visibility = teamDocument?.visibility === 'public' ? 'public' : 'private';
    }

    const gameId = new mongoose.Types.ObjectId();
    const replay = data.replay;

    // Participants & manches dérivés du replay (pour listing/projection).
    const participants = (replay.players ?? []).map((player: any) => ({
      seatIndex: player.seat,
      team: teamLetterOfSeat(player.seat),
      type: player.type === 'robot' ? 'robot' : 'human',
      user: player.type === 'robot' ? null : (player.userId ?? null),
      robot: player.type === 'robot' ? (player.robotId ?? null) : null,
      name: player.name ?? '',
      wasSubstitute: false,
    }));
    const manches = (replay.manches ?? []).map((manche: any, index: number) => ({
      number: manche.index ?? index + 1,
      target: manche.target ?? 0,
      winner: manche.winner ?? null,
      scoreTeamA: manche.cumulative?.A ?? 0,
      scoreTeamB: manche.cumulative?.B ?? 0,
    }));

    // Replay froid d'abord, agrégat ensuite (commit).
    await GameReplayModel.create({ _id: gameId, game: gameId, replay, logs: data.logs ?? [] });
    const gameDocument = await GameModel.create({
      _id: gameId,
      owner: userId, team: teamId, visibility,
      mode: data.mode ?? 'local', winner: data.winner ?? null, target: data.target ?? 0,
      participants, manches,
      projection: { status: 'pending', version: 0, at: null },
    });

    await UserModel.findByIdAndUpdate(userId, { $inc: { gamesPlayed: 1, rewardPoints: data.winner ? 10 : 2 } });
    eventBus.publish<GameFinishedPayload>(DomainEvents.GameFinished, { gameId: String(gameDocument._id) });
    return { id: String(gameDocument._id), visibility };
  }
}

export const gameQueryService = new GameQueryService();
