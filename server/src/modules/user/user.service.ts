import { UserModel } from './user.model.js';
import { TeamModel } from '../team/team.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { computePlayerLevel } from '../../shared/levels.js';
import { notFound } from '../../core/HttpError.js';

export class UserService {
  async getPublicProfile(userId: string) {
    const userDocument: any = await UserModel.findById(userId).select('username rewardPoints gamesPlayed team').lean();
    if (!userDocument) throw notFound();
    const teamDocument: any = userDocument.team ? await TeamModel.findById(userDocument.team).select('name visibility').lean() : null;
    const robotCount = await RobotModel.countDocuments({ owner: userDocument._id });
    return {
      id: String(userDocument._id),
      username: userDocument.username,
      level: computePlayerLevel(userDocument.rewardPoints),
      rewardPoints: userDocument.rewardPoints ?? 0,
      gamesPlayed: userDocument.gamesPlayed ?? 0,
      robots: robotCount,
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
