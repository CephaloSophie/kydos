import { InvitationModel } from './invitation.model.js';
import { TeamModel } from '../team/team.model.js';
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
    invitationDocument.status = 'accepted';
    await invitationDocument.save();
    await UserModel.findByIdAndUpdate(userId, { $set: { team: invitationDocument.team } });
    await InvitationModel.updateMany({ to: userId, status: 'pending', _id: { $ne: invitationDocument._id } }, { $set: { status: 'declined' } });
    return String(invitationDocument.team);
  }

  async decline(invitationId: string, userId: string) {
    const invitationDocument = await InvitationModel.findOneAndUpdate({ _id: invitationId, to: userId, status: 'pending' }, { $set: { status: 'declined' } });
    if (!invitationDocument) throw notFound('invitation introuvable');
  }
}

export const invitationService = new InvitationService();
