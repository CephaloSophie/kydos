import { ParticipationFactModel } from './participationFact.model.js';
import { notFound } from '../../core/HttpError.js';

interface AggregatedStats {
  donnesPlayed: number;
  donnesWon: number;
  winRate: number;
  asBidder: number;
  asBidderWon: number;
  bidderWinRate: number;
  byTrump: { trump: string; donnes: number; won: number }[];
}

/**
 * Service d'ANALYSE : agrège le modèle de lecture (ParticipationFact).
 * Aucune jointure — tout le contexte est déjà dénormalisé → requêtes rapides.
 */
export class AnalyticsService {
  private async aggregateFor(match: Record<string, unknown>): Promise<AggregatedStats> {
    const [totals] = await ParticipationFactModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          donnesPlayed: { $sum: 1 },
          donnesWon: { $sum: { $cond: ['$wonDonne', 1, 0] } },
          asBidder: { $sum: { $cond: ['$wasBidder', 1, 0] } },
          asBidderWon: { $sum: { $cond: [{ $and: ['$wasBidder', '$wonDonne'] }, 1, 0] } },
        },
      },
    ]);

    const byTrump = await ParticipationFactModel.aggregate([
      { $match: { ...match, trump: { $ne: null } } },
      { $group: { _id: '$trump', donnes: { $sum: 1 }, won: { $sum: { $cond: ['$wonDonne', 1, 0] } } } },
      { $project: { _id: 0, trump: '$_id', donnes: 1, won: 1 } },
      { $sort: { donnes: -1 } },
    ]);

    const donnesPlayed = totals?.donnesPlayed ?? 0;
    const asBidder = totals?.asBidder ?? 0;
    return {
      donnesPlayed,
      donnesWon: totals?.donnesWon ?? 0,
      winRate: donnesPlayed ? Number(((totals.donnesWon / donnesPlayed) * 100).toFixed(1)) : 0,
      asBidder,
      asBidderWon: totals?.asBidderWon ?? 0,
      bidderWinRate: asBidder ? Number(((totals.asBidderWon / asBidder) * 100).toFixed(1)) : 0,
      byTrump,
    };
  }

  async getRobotStats(robotId: string) {
    const stats = await this.aggregateFor({ robot: robotId });
    if (stats.donnesPlayed === 0) throw notFound('aucune donnée pour ce robot');
    return stats;
  }

  async getPlayerStats(userId: string) {
    return this.aggregateFor({ user: userId });
  }
}

export const analyticsService = new AnalyticsService();
