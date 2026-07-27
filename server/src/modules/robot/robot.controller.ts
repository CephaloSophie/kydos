import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { robotService } from './robot.service.js';

export class RobotController {
  async list(request: AuthenticatedRequest, response: Response) { response.json({ robots: await robotService.listByOwner(request.userId!) }); }
  async create(request: AuthenticatedRequest, response: Response) { response.json({ robot: await robotService.create(request.userId!, request.body ?? {}) }); }
  async update(request: AuthenticatedRequest, response: Response) { response.json({ robot: await robotService.update(request.params.id, request.userId!, request.body ?? {}) }); }
  async remove(request: AuthenticatedRequest, response: Response) { await robotService.remove(request.params.id, request.userId!); response.json({ ok: true }); }
  async getPublicProfile(request: AuthenticatedRequest, response: Response) { response.json({ robot: await robotService.getPublicProfile(request.params.id) }); }
}

export const robotController = new RobotController();
