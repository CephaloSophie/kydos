import { UserModel } from './user.model.js';
import { TeamModel } from '../team/team.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { GameModel } from '../game/game.model.js';
import { computePlayerLevel } from '../../shared/levels.js';
import { notFound } from '../../core/HttpError.js';

/** ELO d'affichage dérivé de la personnalité (1000 base + agressivité/mémoire). */
export function eloFromPersonality(personality?: { aggressiveness?: number; concentration?: number; velocity?: number }): number {
  const a = personality?.aggressiveness ?? 5;
  const c = personality?.concentration ?? 5;
  const v = personality?.velocity ?? 5;
  return Math.round(1000 + (a + c + v) / 30 * 900);
}

/** Libellé de rang indicatif à partir du niveau. */
export function rankLabel(level: number): string {
  if (level >= 30) return 'Maître';
  if (level >= 20) return 'Expert';
  if (level >= 12) return 'Confirmé';
  if (level >= 6) return 'Initié';
  return 'Débutant';
}

export class UserService {
  async getPublicProfile(userId: string) {
    const userDocument: any = await UserModel.findById(userId).select('username rewardPoints gamesPlayed team').lean();
    if (!userDocument) throw notFound();
    const teamDocument: any = userDocument.team ? await TeamModel.findById(userDocument.team).select('name visibility').lean() : null;

    // Fiches robots du joueur (nom + force estimée pour l'affichage).
    const robotDocuments: any[] = await RobotModel.find({ owner: userDocument._id }).select('name personality mobile').lean();
    const robots = robotDocuments.map((robot) => ({
      id: String(robot._id),
      name: robot.name,
      // ELO d'affichage dérivé de la personnalité (cohérent avec l'app).
      elo: eloFromPersonality(robot.personality),
      avatarId: robot.mobile?.avatarId ?? null,
    }));

    // Bilan victoires / défaites calculé sur les parties archivées où le joueur
    // a participé (on regarde le camp de son siège vs le vainqueur).
    const games: any[] = await GameModel.find({ 'participants.user': userDocument._id })
      .select('winner participants').lean();
    let wins = 0, losses = 0;
    for (const game of games) {
      const mine = (game.participants ?? []).find((p: any) => String(p.user) === String(userDocument._id));
      if (!mine || !game.winner) continue;
      if (game.winner === mine.team) wins++; else losses++;
    }
    const played = games.length;

    return {
      id: String(userDocument._id),
      username: userDocument.username,
      level: computePlayerLevel(userDocument.rewardPoints),
      rewardPoints: userDocument.rewardPoints ?? 0,
      // Rang indicatif basé sur le niveau/points (pas de classement mondial live).
      rank: rankLabel(computePlayerLevel(userDocument.rewardPoints)),
      gamesPlayed: Math.max(userDocument.gamesPlayed ?? 0, played),
      wins,
      losses,
      robotCount: robots.length,
      robots,
      team: teamDocument ? { id: String(userDocument.team), name: teamDocument.name, visibility: teamDocument.visibility } : null,
    };
  }

  async search(query: string, excludeUserId: string) {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 1) return [];
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const userDocuments = await UserModel.find({
      username: { $regex: '^' + escapedQuery, $options: 'i' },
      _id: { $ne: excludeUserId },
    }).select('username').limit(8).lean();
    return userDocuments.map((userDocument: any) => ({ id: String(userDocument._id), username: userDocument.username }));
  }
}

export const userService = new UserService();
