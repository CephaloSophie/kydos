import { RobotModel } from './robot.model.js';
import { UserModel } from '../user/user.model.js';
import { badRequest, forbidden, notFound } from '../../core/HttpError.js';

export class RobotService {
  async listByOwner(ownerId: string) {
    const robotDocuments = await RobotModel.find({ owner: ownerId }).sort('-createdAt').lean();
    return robotDocuments.map((robotDocument: any) => ({
      id: String(robotDocument._id),
      name: robotDocument.name,
      personality: robotDocument.personality,
      responseTimeMs: robotDocument.responseTimeMs,
      maxPlayTimeMs: robotDocument.maxPlayTimeMs,
      algoSpec: robotDocument.algoSpec,
      offlineEnabled: robotDocument.offlineEnabled,
      representativeSlot: robotDocument.representativeSlot,
    }));
  }

  async create(ownerId: string, data: any) {
    if (!data.name) throw badRequest('nom requis');
    // bidResponseMs reste fixe (700 ms) — on ignore toute tentative de l'utilisateur.
    const { bidResponseMs: _ignored, ...allowed } = data;
    const robotDocument = await RobotModel.create({ owner: ownerId, ...allowed });
    return { id: String(robotDocument._id), name: robotDocument.name };
  }

  async update(robotId: string, ownerId: string, updates: any) {
    const { bidResponseMs: _ignored, ...allowed } = updates;
    if (typeof allowed.representativeSlot === 'number' && allowed.representativeSlot > 0) {
      await RobotModel.updateMany({ owner: ownerId, representativeSlot: allowed.representativeSlot, _id: { $ne: robotId } }, { $set: { representativeSlot: 0 } });
    }
    const robotDocument = await RobotModel.findOneAndUpdate({ _id: robotId, owner: ownerId }, { $set: allowed }, { new: true });
    if (!robotDocument) throw notFound();
    return { id: String(robotDocument._id), name: robotDocument.name };
  }

  async remove(robotId: string, ownerId: string) {
    await RobotModel.deleteOne({ _id: robotId, owner: ownerId });
  }

  async getPublicProfile(robotId: string) {
    const robotDocument: any = await RobotModel.findById(robotId).lean();
    if (!robotDocument) throw notFound();
    const ownerDocument: any = await UserModel.findById(robotDocument.owner).select('username').lean();
    return {
      id: String(robotDocument._id),
      name: robotDocument.name,
      personality: robotDocument.personality,
      algoName: robotDocument.algoSpec?.name ?? 'Classique',
      hasWorkflow: !!robotDocument.algoSpec?.workflow,
      owner: ownerDocument ? { id: String(robotDocument.owner), username: ownerDocument.username } : null,
    };
  }
}

export const robotService = new RobotService();
