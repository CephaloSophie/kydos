import { levelForScore } from 'belote-core';
import { UserModel } from './user.model.js';
import { TeamModel } from '../team/team.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { GameModel } from '../game/game.model.js';
import { scoreConfigService } from '../scoreConfig/scoreConfig.service.js';
import { playerAvatarService } from '../playerAvatar/playerAvatar.service.js';
import { serializePublicUser } from './user.serializer.js';
import { badRequest, notFound } from '../../core/HttpError.js';

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

    // v19 — niveau & progression dérivés du modèle UNIQUE Kýdos (config live).
    const scoreConfig = await scoreConfigService.get();
    const progress = levelForScore(scoreConfig, userDocument.rewardPoints ?? 0);

    return {
      id: String(userDocument._id),
      username: userDocument.username,
      level: progress.level,
      rewardPoints: userDocument.rewardPoints ?? 0,
      // v19 — points accumulés dans le niveau courant + restants pour le suivant.
      scoreInLevel: progress.pointsInLevel,
      pointsToNextLevel: progress.pointsToNext,
      // Rang indicatif basé sur le niveau/points (pas de classement mondial live).
      rank: rankLabel(progress.level),
      gamesPlayed: Math.max(userDocument.gamesPlayed ?? 0, played),
      wins,
      losses,
      robotCount: robots.length,
      robots,
      team: teamDocument ? { id: String(userDocument.team), name: teamDocument.name, visibility: teamDocument.visibility } : null,
    };
  }

  /**
   * Met à jour le PROFIL enrichi de l'utilisateur courant : prénom, nom, e-mail
   * et logo choisi (avatarId). Chaque champ est optionnel ; seuls les champs
   * fournis sont modifiés. Le logo est validé contre le catalogue actif.
   */
  async updateMyProfile(userId: string, input: { firstName?: unknown; lastName?: unknown; email?: unknown; avatarId?: unknown }) {
    const set: Record<string, unknown> = {};
    const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
    if (input.firstName !== undefined) set.firstName = str(input.firstName, 60);
    if (input.lastName !== undefined) set.lastName = str(input.lastName, 60);
    if (input.email !== undefined) {
      const email = str(input.email, 120);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('adresse e-mail invalide');
      set.email = email || null;
    }
    if (input.avatarId !== undefined) {
      const key = input.avatarId === null ? null : str(input.avatarId, 40);
      if (key && !(await playerAvatarService.isValidKey(key))) throw badRequest('logo inconnu');
      set.avatarId = key || null;
    }
    const userDocument = await UserModel.findByIdAndUpdate(userId, { $set: set }, { new: true });
    if (!userDocument) throw notFound();
    return serializePublicUser(userDocument);
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
