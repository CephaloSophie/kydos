import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { invitationService } from './invitation.service.js';

export class InvitationController {
  async invite(request: AuthenticatedRequest, response: Response) { response.json({ invitation: await invitationService.invite(request.params.id, request.userId!, request.body?.identifier ?? '') }); }
  async listReceived(request: AuthenticatedRequest, response: Response) { response.json({ invitations: await invitationService.listReceived(request.userId!) }); }
  async listSentByTeam(request: AuthenticatedRequest, response: Response) { response.json({ invitations: await invitationService.listSentByTeam(request.params.id, request.userId!) }); }
  async accept(request: AuthenticatedRequest, response: Response) { response.json({ ok: true, teamId: await invitationService.accept(request.params.id, request.userId!) }); }
  async decline(request: AuthenticatedRequest, response: Response) { await invitationService.decline(request.params.id, request.userId!); response.json({ ok: true }); }
}

export const invitationController = new InvitationController();
