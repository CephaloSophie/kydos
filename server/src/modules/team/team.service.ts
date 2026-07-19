import { TeamModel } from './team.model.js';
import { UserModel } from '../user/user.model.js';
import { computePlayerLevel } from '../../shared/levels.js';
import { badRequest, conflict, forbidden, notFound } from '../../core/HttpError.js';

function serializeMember(memberDocument: any) {
  return { id: String(memberDocument._id), username: memberDocument.username, rewardPoints: memberDocument.rewardPoints, level: computePlayerLevel(memberDocument.rewardPoints) };
}

export class TeamService {
  async listRanked() {
    const teamDocuments = await TeamModel.find().sort('-points').limit(100).lean();
    const memberCounts = await UserModel.aggregate([{ $match: { team: { $ne: null } } }, { $group: { _id: '$team', count: { $sum: 1 } } }]);
    const countByTeamId = new Map(memberCounts.map((entry: any) => [String(entry._id), entry.count]));
    return teamDocuments
      .map((teamDocument: any) => ({ id: String(teamDocument._id), name: teamDocument.name, points: teamDocument.points, members: countByTeamId.get(String(teamDocument._id)) ?? 0 }))
      .sort((teamA, teamB) => teamB.points - teamA.points || teamB.members - teamA.members);
  }

  async getMyTeam(userId: string) {
    const userDocument = await UserModel.findById(userId);
    if (!userDocument?.team) return { team: null, members: [] };
    const teamDocument: any = await TeamModel.findById(userDocument.team).lean();
    const memberDocuments = await UserModel.find({ team: userDocument.team }).select('username rewardPoints gamesPlayed').lean();
    return {
      team: teamDocument ? { id: String(teamDocument._id), name: teamDocument.name, points: teamDocument.points, owner: String(teamDocument.owner), visibility: teamDocument.visibility } : null,
      members: memberDocuments.map(serializeMember),
    };
  }

  async create(userId: string, name: string, visibility?: string) {
    if (!name) throw badRequest('nom requis');
    if (await TeamModel.findOne({ name })) throw conflict('nom déjà pris');
    const teamDocument = await TeamModel.create({ name, owner: userId, visibility: visibility === 'public' ? 'public' : 'private' });
    await UserModel.findByIdAndUpdate(userId, { $set: { team: teamDocument._id } });
    return { id: String(teamDocument._id), name: teamDocument.name, visibility: teamDocument.visibility };
  }

  async getDetail(teamId: string) {
    const teamDocument: any = await TeamModel.findById(teamId).lean();
    if (!teamDocument) throw notFound();
    const memberDocuments = await UserModel.find({ team: teamDocument._id }).select('username rewardPoints').lean();
    return {
      team: { id: String(teamDocument._id), name: teamDocument.name, points: teamDocument.points, owner: String(teamDocument.owner), visibility: teamDocument.visibility },
      members: memberDocuments.map(serializeMember),
    };
  }

  async update(teamId: string, ownerId: string, updates: { name?: string; visibility?: string }) {
    const teamDocument = await TeamModel.findById(teamId);
    if (!teamDocument) throw notFound();
    if (String(teamDocument.owner) !== ownerId) throw forbidden('propriétaire requis');
    if (updates.name) teamDocument.name = updates.name;
    if (updates.visibility === 'public' || updates.visibility === 'private') teamDocument.visibility = updates.visibility;
    await teamDocument.save();
    return { id: String(teamDocument._id), name: teamDocument.name, visibility: teamDocument.visibility };
  }

  async join(userId: string, teamId: string) {
    const teamDocument = await TeamModel.findById(teamId);
    if (!teamDocument) throw notFound('équipe introuvable');
    await UserModel.findByIdAndUpdate(userId, { $set: { team: teamDocument._id } });
    return { id: String(teamDocument._id), name: teamDocument.name };
  }

  async leave(userId: string) {
    await UserModel.findByIdAndUpdate(userId, { $set: { team: null } });
  }
}

export const teamService = new TeamService();
