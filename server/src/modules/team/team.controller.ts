import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { teamService } from './team.service.js';

export class TeamController {
  async listRanked(_request: AuthenticatedRequest, response: Response) { response.json({ teams: await teamService.listRanked() }); }
  async getMyTeam(request: AuthenticatedRequest, response: Response) { response.json(await teamService.getMyTeam(request.userId!)); }
  async create(request: AuthenticatedRequest, response: Response) { response.json({ team: await teamService.create(request.userId!, request.body?.name, request.body?.visibility) }); }
  async getDetail(request: AuthenticatedRequest, response: Response) { response.json(await teamService.getDetail(request.params.id)); }
  async update(request: AuthenticatedRequest, response: Response) { response.json({ team: await teamService.update(request.params.id, request.userId!, request.body ?? {}) }); }
  async join(request: AuthenticatedRequest, response: Response) { response.json({ ok: true, team: await teamService.join(request.userId!, request.params.id) }); }
  async leave(request: AuthenticatedRequest, response: Response) { await teamService.leave(request.userId!); response.json({ ok: true }); }
}

export const teamController = new TeamController();
