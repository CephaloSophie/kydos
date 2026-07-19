import { ParticipationFactModel } from './participationFact.model.js';
import { GameModel } from '../game/game.model.js';
import { GameReplayModel } from '../game/gameReplay.model.js';
import { createLogger } from '../../core/logger.js';

const logger = createLogger('analytics-projection');

/** Version du schéma de projection : incrémenter quand la dérivation des faits change. */
export const PROJECTION_VERSION = 1;

const teamLetterOfSeat = (seat: number): 'A' | 'B' => (seat % 2 === 0 ? 'A' : 'B');

/**
 * Projection CQRS : dérive les faits de participation à partir de l'agrégat Game
 * (participants, winner) et de son GameReplay (manches → donnes).
 *  - UNE seule fonction sert le LIVE et le REBUILD (même chemin → « reconstructible » réel).
 *  - Idempotente : purge les faits du game avant réinsertion.
 *  - Marque Game.projection { status, version, at } → dérive détectable & rejouable.
 *  - L'échec n'altère jamais la source de vérité (Game + GameReplay restent intacts).
 */
export class GameProjectionService {
  async projectGame(gameId: string): Promise<number> {
    const game: any = await GameModel.findById(gameId).lean();
    const replayDoc: any = await GameReplayModel.findById(gameId).lean();
    if (!game || !replayDoc?.replay) {
      logger.warn('projection ignorée (game/replay introuvable)', { game: gameId });
      return 0;
    }

    try {
      const facts = this.buildFacts(game, replayDoc.replay);
      await ParticipationFactModel.deleteMany({ game: gameId });
      if (facts.length) await ParticipationFactModel.insertMany(facts, { ordered: false });
      await GameModel.findByIdAndUpdate(gameId, { $set: { projection: { status: 'done', version: PROJECTION_VERSION, at: new Date() } } });
      logger.info('faits projetés', { game: gameId, facts: facts.length });
      return facts.length;
    } catch (error) {
      await GameModel.findByIdAndUpdate(gameId, { $set: { 'projection.status': 'failed', 'projection.at': new Date() } });
      logger.error('projection en échec', { game: gameId, error: (error as Error).message });
      return 0;
    }
  }

  /** Reconstruit les projections manquantes/obsolètes (statut != done OU version < courante). */
  async rebuildOutdated(limit = 500): Promise<{ scanned: number; rebuilt: number }> {
    const games: any[] = await GameModel.find({
      $or: [{ 'projection.status': { $ne: 'done' } }, { 'projection.version': { $lt: PROJECTION_VERSION } }],
    }).select('_id').limit(limit).lean();
    let rebuilt = 0;
    for (const game of games) rebuilt += (await this.projectGame(String(game._id))) > 0 ? 1 : 0;
    logger.info('rebuild terminé', { scanned: games.length, rebuilt });
    return { scanned: games.length, rebuilt };
  }

  private buildFacts(game: any, replay: any): Record<string, unknown>[] {
    const facts: Record<string, unknown>[] = [];
    const participants = game.participants ?? [];

    (replay.manches ?? []).forEach((manche: any, mancheIdx: number) => {
      const mancheWinner = manche.winner ?? null;
      (manche.donnes ?? []).forEach((donne: any, donneIdx: number) => {
        const score = donne.donneScore ?? { A: 0, B: 0 };
        for (const participant of participants) {
          const team = teamLetterOfSeat(participant.seatIndex);
          const opponent = team === 'A' ? 'B' : 'A';
          facts.push({
            game: game._id,
            participantType: participant.type,
            user: participant.user ?? null,
            robot: participant.robot ?? null,
            seatIndex: participant.seatIndex,
            team,
            mancheNumber: manche.index ?? mancheIdx + 1,
            donneNumber: donneIdx + 1,
            trump: donne.trump ?? null,
            contract: donne.contract ?? null,
            contre: donne.contre ?? 'none',
            wasBidder: donne.bidderSeat === participant.seatIndex,
            wasSubstitute: !!participant.wasSubstitute,
            pointsTeam: score[team] ?? 0,
            pointsOpponent: score[opponent] ?? 0,
            wonDonne: (score[team] ?? 0) > (score[opponent] ?? 0),
            wonManche: mancheWinner === team,
            wonGame: game.winner === team,
            playedAt: new Date(),
          });
        }
      });
    });
    return facts;
  }
}

export const gameProjectionService = new GameProjectionService();
