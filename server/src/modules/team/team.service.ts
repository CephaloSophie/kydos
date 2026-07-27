import { TEAM_MAX_MEMBERS, TeamModel, type TeamRole } from './team.model.js';
import { UserModel } from '../user/user.model.js';
import { computePlayerLevel } from '../../shared/levels.js';
import { badRequest, conflict, forbidden, notFound } from '../../core/HttpError.js';
import { canAct, canAssign, canInvite, canRenameTeam } from './permissions.js';

/** Sérialise un utilisateur en tant que membre visible dans l'app. */
function serializeMember(userDocument: any, role: TeamRole, joinedAt?: Date) {
  return {
    id: String(userDocument._id),
    username: userDocument.username,
    role,
    rewardPoints: userDocument.rewardPoints,
    level: computePlayerLevel(userDocument.rewardPoints),
    joinedAt: joinedAt ? joinedAt.toISOString() : undefined,
  };
}

/**
 * Récupère le rôle d'un utilisateur au sein d'une équipe (`null` si non-membre).
 * On sépare la fonction pour la réutiliser aux points de contrôle.
 */
function roleOf(teamDocument: any, userId: string): TeamRole | null {
  const member = teamDocument.members?.find?.((entry: any) => String(entry.user) === String(userId));
  return member ? (member.role as TeamRole) : null;
}

/**
 * Contrôle une action : charge l'équipe, vérifie que l'acteur en est membre,
 * vérifie qu'il a bien l'autorité demandée sur la cible.
 * Renvoie `{ team, actorRole, targetRole }` prêts à l'emploi.
 */
async function assertActionAllowed(teamId: string, actorId: string, targetUserId?: string) {
  const teamDocument = await TeamModel.findById(teamId);
  if (!teamDocument) throw notFound('équipe introuvable');
  const actorRole = roleOf(teamDocument, actorId);
  if (!actorRole) throw forbidden('non membre');
  let targetRole: TeamRole | null = null;
  if (targetUserId) {
    targetRole = roleOf(teamDocument, targetUserId);
    if (!targetRole) throw notFound('membre cible introuvable');
    if (!canAct(actorRole, targetRole)) throw forbidden("autorité insuffisante");
  }
  return { teamDocument, actorRole, targetRole };
}

export class TeamService {
  async listRanked() {
    const teamDocuments = await TeamModel.find().sort('-points').limit(100).lean();
    return teamDocuments
      .map((teamDocument: any) => ({
        id: String(teamDocument._id),
        name: teamDocument.name,
        points: teamDocument.points,
        members: teamDocument.members?.length ?? 0,
        visibility: teamDocument.visibility,
      }))
      .sort((teamA, teamB) => teamB.points - teamA.points || teamB.members - teamA.members);
  }

  async getMyTeam(userId: string) {
    // Retourne l'équipe POSSÉDÉE en priorité, sinon la première équipe rejointe.
    let teamDocument: any = await TeamModel.findOne({ owner: userId }).lean();
    if (!teamDocument) teamDocument = await TeamModel.findOne({ 'members.user': userId }).lean();
    if (!teamDocument) return { team: null, members: [], myRole: null };

    const userIds = teamDocument.members.map((entry: any) => entry.user);
    const users = await UserModel.find({ _id: { $in: userIds } }).select('username rewardPoints').lean();
    const byId = new Map(users.map((entry: any) => [String(entry._id), entry]));
    const members = teamDocument.members.map((entry: any) => serializeMember(byId.get(String(entry.user)) ?? { _id: entry.user, username: '?', rewardPoints: 0 }, entry.role, entry.joinedAt));
    const myMember = teamDocument.members.find((entry: any) => String(entry.user) === userId);

    return {
      team: {
        id: String(teamDocument._id),
        name: teamDocument.name,
        points: teamDocument.points,
        owner: String(teamDocument.owner),
        visibility: teamDocument.visibility,
      },
      members,
      myRole: myMember?.role ?? null,
    };
  }

  /**
   * Créer une équipe : l'utilisateur ne peut posséder QU'UNE seule équipe
   * (index unique sur `owner` en model, sécurité en runtime ici).
   * L'auteur devient automatiquement le premier membre en `owner`.
   */
  async create(userId: string, name: string, visibility?: string) {
    if (!name || !name.trim()) throw badRequest('nom requis');
    if (await TeamModel.findOne({ owner: userId })) throw conflict('vous possédez déjà une équipe');
    if (await TeamModel.findOne({ name: name.trim() })) throw conflict('nom déjà pris');
    const teamDocument = await TeamModel.create({
      name: name.trim(),
      owner: userId,
      visibility: visibility === 'public' ? 'public' : 'private',
      members: [{ user: userId, role: 'owner', joinedAt: new Date() }],
    });
    await UserModel.findByIdAndUpdate(userId, { $set: { team: teamDocument._id } });
    return { id: String(teamDocument._id), name: teamDocument.name, visibility: teamDocument.visibility };
  }

  async getDetail(teamId: string, viewerId?: string) {
    const teamDocument: any = await TeamModel.findById(teamId).lean();
    if (!teamDocument) throw notFound();
    const userIds = teamDocument.members.map((entry: any) => entry.user);
    const users = await UserModel.find({ _id: { $in: userIds } }).select('username rewardPoints').lean();
    const byId = new Map(users.map((entry: any) => [String(entry._id), entry]));
    const members = teamDocument.members.map((entry: any) => serializeMember(byId.get(String(entry.user)) ?? { _id: entry.user, username: '?', rewardPoints: 0 }, entry.role, entry.joinedAt));
    const myMember = viewerId ? teamDocument.members.find((entry: any) => String(entry.user) === viewerId) : null;
    return {
      team: {
        id: String(teamDocument._id),
        name: teamDocument.name,
        points: teamDocument.points,
        owner: String(teamDocument.owner),
        visibility: teamDocument.visibility,
      },
      members,
      myRole: myMember?.role ?? null,
    };
  }

  /**
   * Met à jour l'équipe (renommage / visibilité).
   * Renommage réservé à `owner` et `super` ; visibilité réservée à `owner`.
   */
  async update(teamId: string, actorId: string, updates: { name?: string; visibility?: string }) {
    const { teamDocument, actorRole } = await assertActionAllowed(teamId, actorId);
    if (updates.name !== undefined) {
      if (!canRenameTeam(actorRole)) throw forbidden('renommage réservé aux owner/super');
      if (!updates.name.trim()) throw badRequest('nom requis');
      const existing = await TeamModel.findOne({ name: updates.name.trim(), _id: { $ne: teamDocument._id } });
      if (existing) throw conflict('nom déjà pris');
      teamDocument.name = updates.name.trim();
    }
    if (updates.visibility !== undefined) {
      if (actorRole !== 'owner') throw forbidden('visibilité réservée à l\'owner');
      if (updates.visibility === 'public' || updates.visibility === 'private') teamDocument.visibility = updates.visibility;
    }
    await teamDocument.save();
    return { id: String(teamDocument._id), name: teamDocument.name, visibility: teamDocument.visibility };
  }

  /**
   * Ajoute un utilisateur à l'équipe (via une invitation acceptée par exemple).
   * Vérifie la borne de 40 membres. Rôle par défaut `user`.
   */
  async addMember(teamId: string, actorId: string, targetUserId: string, role: TeamRole = 'user') {
    const { teamDocument, actorRole } = await assertActionAllowed(teamId, actorId);
    if (!canInvite(actorRole)) throw forbidden('vous ne pouvez pas inviter');
    if (teamDocument.members.length >= TEAM_MAX_MEMBERS) throw badRequest(`limite ${TEAM_MAX_MEMBERS} membres atteinte`);
    if (teamDocument.members.some((entry: any) => String(entry.user) === String(targetUserId))) throw conflict('déjà membre');
    if (!canAssign(actorRole, role)) throw forbidden(`autorité insuffisante pour attribuer ${role}`);
    teamDocument.members.push({ user: targetUserId, role, joinedAt: new Date() } as any);
    await teamDocument.save();
    return { ok: true };
  }

  /** Rejoint une équipe publique directement (rôle `user`). */
  async join(userId: string, teamId: string) {
    const teamDocument = await TeamModel.findById(teamId);
    if (!teamDocument) throw notFound('équipe introuvable');
    if (teamDocument.visibility !== 'public') throw forbidden('équipe privée');
    if (teamDocument.members.length >= TEAM_MAX_MEMBERS) throw badRequest(`limite ${TEAM_MAX_MEMBERS} membres atteinte`);
    if (teamDocument.members.some((entry: any) => String(entry.user) === String(userId))) throw conflict('déjà membre');
    teamDocument.members.push({ user: userId, role: 'user', joinedAt: new Date() } as any);
    await teamDocument.save();
    return { id: String(teamDocument._id), name: teamDocument.name };
  }

  /**
   * Quitte l'équipe. Le propriétaire ne peut pas partir tant qu'il en est
   * propriétaire (il doit d'abord la dissoudre ou transférer).
   */
  async leave(userId: string, teamId: string) {
    const teamDocument = await TeamModel.findById(teamId);
    if (!teamDocument) throw notFound('équipe introuvable');
    if (String(teamDocument.owner) === userId) throw forbidden("l'owner doit d'abord dissoudre ou transférer");
    const before = teamDocument.members.length;
    teamDocument.members = teamDocument.members.filter((entry: any) => String(entry.user) !== userId) as any;
    if (teamDocument.members.length === before) throw notFound('non membre');
    await teamDocument.save();
    return { ok: true };
  }

  /** Exclut un membre — soumis aux permissions (canAct actor vs target). */
  async kickMember(teamId: string, actorId: string, targetUserId: string) {
    const { teamDocument } = await assertActionAllowed(teamId, actorId, targetUserId);
    teamDocument.members = teamDocument.members.filter((entry: any) => String(entry.user) !== targetUserId) as any;
    await teamDocument.save();
    return { ok: true };
  }

  /**
   * Change le rôle d'un membre.
   * - Impossible de toucher au rôle `owner`.
   * - `canAct(actor, target)` et `canAssign(actor, newRole)` doivent être vrais.
   */
  async changeRole(teamId: string, actorId: string, targetUserId: string, newRole: TeamRole) {
    const { teamDocument, actorRole, targetRole } = await assertActionAllowed(teamId, actorId, targetUserId);
    if (targetRole === 'owner' || newRole === 'owner') throw forbidden('rôle owner protégé');
    if (!canAssign(actorRole, newRole)) throw forbidden(`autorité insuffisante pour attribuer ${newRole}`);
    const member = teamDocument.members.find((entry: any) => String(entry.user) === targetUserId);
    if (member) member.role = newRole;
    await teamDocument.save();
    return { ok: true };
  }
}

export const teamService = new TeamService();
