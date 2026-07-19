import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { brainService } from './brain.service.js';

export class BrainController {
  async list(req: AuthenticatedRequest, res: Response) { res.json({ projects: await brainService.listByOwner(req.userId!) }); }
  async getOne(req: AuthenticatedRequest, res: Response) { res.json({ project: await brainService.getOne(req.params.id, req.userId!) }); }
  async create(req: AuthenticatedRequest, res: Response) { res.json({ project: await brainService.create(req.userId!, req.body ?? {}) }); }
  async updateVersion(req: AuthenticatedRequest, res: Response) { res.json({ project: await brainService.updateVersion(req.params.id, req.userId!, Number(req.params.v), req.body ?? {}) }); }
  async addVersion(req: AuthenticatedRequest, res: Response) { res.json({ project: await brainService.addVersion(req.params.id, req.userId!, req.body ?? {}) }); }
  async switchVersion(req: AuthenticatedRequest, res: Response) { res.json({ project: await brainService.switchVersion(req.params.id, req.userId!, Number(req.params.v)) }); }
  async clone(req: AuthenticatedRequest, res: Response) { res.json({ project: await brainService.clone(req.params.id, req.userId!, req.body ?? {}) }); }
  async remove(req: AuthenticatedRequest, res: Response) { await brainService.remove(req.params.id, req.userId!); res.json({ ok: true }); }
}
export const brainController = new BrainController();
