import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { teamService } from './team.service.js';
import type { TeamRole } from './team.model.js';

export class TeamController {
  async listRanked(_request: AuthenticatedRequest, response: Response) {
    response.json({ teams: await teamService.listRanked() });
  }
  async getMyTeam(request: AuthenticatedRequest, response: Response) {
    response.json(await teamService.getMyTeam(request.userId!));
  }
  async create(request: AuthenticatedRequest, response: Response) {
    response.json({ team: await teamService.create(request.userId!, request.body?.name, request.body?.visibility) });
  }
  async getDetail(request: AuthenticatedRequest, response: Response) {
    response.json(await teamService.getDetail(request.params.id, request.userId));
  }
  async update(request: AuthenticatedRequest, response: Response) {
    response.json({ team: await teamService.update(request.params.id, request.userId!, request.body ?? {}) });
  }
  async join(request: AuthenticatedRequest, response: Response) {
    response.json({ ok: true, team: await teamService.join(request.userId!, request.params.id) });
  }
  async leave(request: AuthenticatedRequest, response: Response) {
    await teamService.leave(request.userId!, request.params.id);
    response.json({ ok: true });
  }
  async kick(request: AuthenticatedRequest, response: Response) {
    response.json(await teamService.kickMember(request.params.id, request.userId!, request.params.userId));
  }
  async changeRole(request: AuthenticatedRequest, response: Response) {
    response.json(await teamService.changeRole(request.params.id, request.userId!, request.params.userId, request.body?.role as TeamRole));
  }
}

export const teamController = new TeamController();
