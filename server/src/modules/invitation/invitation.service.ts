import { InvitationModel } from './invitation.model.js';
import { TeamModel, TEAM_MAX_MEMBERS } from '../team/team.model.js';
import { UserModel } from '../user/user.model.js';
import { badRequest, conflict, forbidden, notFound } from '../../core/HttpError.js';

export class InvitationService {
  async invite(teamId: string, senderId: string, identifier: string) {
    const teamDocument = await TeamModel.findById(teamId);
    if (!teamDocument) throw notFound('équipe introuvable');
    if (String(teamDocument.owner) !== senderId) throw forbidden('seul le propriétaire invite');
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) throw badRequest('identifiant requis');

    let targetUser: any = null;
    if (/^[a-f\d]{24}$/i.test(trimmedIdentifier)) targetUser = await UserModel.findById(trimmedIdentifier);
    if (!targetUser && trimmedIdentifier.includes('@')) targetUser = await UserModel.findOne({ email: trimmedIdentifier });
    if (!targetUser) {
      const escapedIdentifier = trimmedIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      targetUser = await UserModel.findOne({ username: new RegExp('^' + escapedIdentifier + '$', 'i') });
    }
    if (!targetUser) throw notFound('utilisateur introuvable');
    if (String(targetUser._id) === senderId) throw badRequest('vous ne pouvez pas vous inviter vous-même');
    if (targetUser.team && String(targetUser.team) === String(teamDocument._id)) throw conflict('déjà membre');
    if (await InvitationModel.findOne({ team: teamDocument._id, to: targetUser._id, status: 'pending' })) throw conflict('invitation déjà en attente');

    const invitationDocument = await InvitationModel.create({ team: teamDocument._id, from: senderId, to: targetUser._id, status: 'pending' });
    return { id: String(invitationDocument._id), to: { id: String(targetUser._id), username: targetUser.username }, status: 'pending' };
  }

  async listReceived(userId: string) {
    const invitationDocuments: any[] = await InvitationModel.find({ to: userId, status: 'pending' }).sort('-createdAt').lean();
    const teamsMap = new Map((await TeamModel.find({ _id: { $in: invitationDocuments.map((i) => i.team) } }).select('name visibility').lean()).map((t: any) => [String(t._id), t]));
    const sendersMap = new Map((await UserModel.find({ _id: { $in: invitationDocuments.map((i) => i.from) } }).select('username').lean()).map((u: any) => [String(u._id), u]));
    return invitationDocuments.map((invitationDocument) => ({
      id: String(invitationDocument._id),
      team: { id: String(invitationDocument.team), name: teamsMap.get(String(invitationDocument.team))?.name ?? '?', visibility: teamsMap.get(String(invitationDocument.team))?.visibility ?? 'private' },
      from: { id: String(invitationDocument.from), username: sendersMap.get(String(invitationDocument.from))?.username ?? '?' },
      createdAt: invitationDocument.createdAt,
    }));
  }

  async listSentByTeam(teamId: string, ownerId: string) {
    const teamDocument = await TeamModel.findById(teamId);
    if (!teamDocument || String(teamDocument.owner) !== ownerId) throw forbidden('propriétaire requis');
    const invitationDocuments: any[] = await InvitationModel.find({ team: teamDocument._id, status: 'pending' }).lean();
    const recipientsMap = new Map((await UserModel.find({ _id: { $in: invitationDocuments.map((i) => i.to) } }).select('username').lean()).map((u: any) => [String(u._id), u]));
    return invitationDocuments.map((invitationDocument) => ({ id: String(invitationDocument._id), to: { id: String(invitationDocument.to), username: recipientsMap.get(String(invitationDocument.to))?.username ?? '?' }, status: invitationDocument.status }));
  }

  async accept(invitationId: string, userId: string) {
    const invitationDocument = await InvitationModel.findOne({ _id: invitationId, to: userId, status: 'pending' });
    if (!invitationDocument) throw notFound('invitation introuvable');

    const teamDocument = await TeamModel.findById(invitationDocument.team);
    if (!teamDocument) {
      // L'équipe a disparu entre-temps : on retire l'invitation devenue caduque.
      invitationDocument.status = 'cancelled';
      await invitationDocument.save();
      throw notFound('équipe introuvable');
    }
    // Un utilisateur ne peut appartenir qu'à UNE équipe.
    const currentUser: any = await UserModel.findById(userId).select('team');
    if (currentUser?.team && String(currentUser.team) !== String(teamDocument._id)) throw conflict('vous êtes déjà dans une équipe');
    // Borne de membres.
    const alreadyMember = teamDocument.members.some((entry: any) => String(entry.user) === String(userId));
    if (!alreadyMember && teamDocument.members.length >= TEAM_MAX_MEMBERS) throw badRequest(`limite ${TEAM_MAX_MEMBERS} membres atteinte`);

    invitationDocument.status = 'accepted';
    await invitationDocument.save();
    if (!alreadyMember) {
      teamDocument.members.push({ user: userId, role: 'user', joinedAt: new Date() } as any);
      await teamDocument.save();
    }
    await UserModel.findByIdAndUpdate(userId, { $set: { team: teamDocument._id } });
    // Les autres invitations en attente pour cet utilisateur deviennent caduques.
    await InvitationModel.updateMany({ to: userId, status: 'pending', _id: { $ne: invitationDocument._id } }, { $set: { status: 'declined' } });
    return String(teamDocument._id);
  }

  async decline(invitationId: string, userId: string) {
    const invitationDocument = await InvitationModel.findOneAndUpdate({ _id: invitationId, to: userId, status: 'pending' }, { $set: { status: 'declined' } });
    if (!invitationDocument) throw notFound('invitation introuvable');
  }

  /**
   * ANNULATION par l'expéditeur : le propriétaire de l'équipe révoque une
   * invitation en attente qu'il a envoyée.
   */
  async cancel(invitationId: string, ownerId: string) {
    const invitationDocument = await InvitationModel.findOne({ _id: invitationId, status: 'pending' });
    if (!invitationDocument) throw notFound('invitation introuvable');
    const teamDocument = await TeamModel.findById(invitationDocument.team);
    if (!teamDocument || String(teamDocument.owner) !== ownerId) throw forbidden('seul le propriétaire annule');
    invitationDocument.status = 'cancelled';
    await invitationDocument.save();
  }

  /** Nombre d'invitations reçues en attente (pour le badge de notification). */
  async countReceived(userId: string): Promise<number> {
    return InvitationModel.countDocuments({ to: userId, status: 'pending' });
  }
}

export const invitationService = new InvitationService();
