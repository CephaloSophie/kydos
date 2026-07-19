import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { competitionService } from './competition.service.js';

export class CompetitionController {
  async create(request: AuthenticatedRequest, response: Response) {
    const { robots, manches } = request.body ?? {};
    response.json({ competition: await competitionService.create(request.userId!, robots ?? [], manches ?? 2) });
  }
  async listOpen(request: AuthenticatedRequest, response: Response) {
    response.json({ competitions: await competitionService.listOpen(request.userId!) });
  }
  async listMine(request: AuthenticatedRequest, response: Response) {
    response.json({ competitions: await competitionService.listMine(request.userId!) });
  }
  async getById(request: AuthenticatedRequest, response: Response) {
    response.json({ competition: await competitionService.getById(request.params.id, request.userId!) });
  }
  async join(request: AuthenticatedRequest, response: Response) {
    const { robots } = request.body ?? {};
    response.json({ competition: await competitionService.join(request.params.id, request.userId!, robots ?? []) });
  }
  async cancel(request: AuthenticatedRequest, response: Response) {
    response.json({ competition: await competitionService.cancel(request.params.id, request.userId!) });
  }
}

export const competitionController = new CompetitionController();
