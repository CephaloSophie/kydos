/* Service centralisant l'écriture des transactions kydos. Chaque flux (match,
 * tournoi) passe par ce point pour ne rien oublier et faciliter le reporting.
 */
import { HouseTransactionModel, HouseTransactionKind } from './houseTransaction.model.js';
import type { Types } from 'mongoose';

export class HouseAccountingService {
  /** Enregistre le rake d'un match terminé. */
  async recordMatchRake(matchId: Types.ObjectId | string, amount: number, note = ''): Promise<void> {
    await HouseTransactionModel.create({ kind: HouseTransactionKind.MATCH_RAKE, matchId, amount, note });
  }

  /** Enregistre le buy-in d'un joueur inscrit à un tournoi. */
  async recordTournamentEntry(tournamentId: Types.ObjectId | string, userId: Types.ObjectId | string, amount: number): Promise<void> {
    await HouseTransactionModel.create({ kind: HouseTransactionKind.TOURNAMENT_ENTRY, tournamentId, userId, amount });
  }

  /** Enregistre un prix versé à un joueur (amount négatif du point de vue kydos). */
  async recordTournamentPrize(tournamentId: Types.ObjectId | string, userId: Types.ObjectId | string, round: number, amount: number): Promise<void> {
    await HouseTransactionModel.create({ kind: HouseTransactionKind.TOURNAMENT_PRIZE, tournamentId, userId, round, amount: -Math.abs(amount) });
  }

  /** Total signé sur une période / un type. */
  async totalByKind(kind?: HouseTransactionKind): Promise<number> {
    const query = kind ? { kind } : {};
    const rows = await HouseTransactionModel.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    return rows[0]?.total ?? 0;
  }
}

export const houseAccountingService = new HouseAccountingService();
