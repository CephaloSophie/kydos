import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { gameQueryService } from './gameQuery.service.js';

export class GameController {
  async list(request: AuthenticatedRequest, response: Response) { response.json({ games: await gameQueryService.listForUser(request.userId!, String(request.query.scope ?? 'mine')) }); }
  async listPublic(request: AuthenticatedRequest, response: Response) {
    response.json({ games: await gameQueryService.listPublicByName(String(request.query.q ?? '')) });
  }
  async getById(request: AuthenticatedRequest, response: Response) { response.json({ game: await gameQueryService.getById(request.params.id, request.userId!) }); }
  async save(request: AuthenticatedRequest, response: Response) { response.json(await gameQueryService.saveLocalGame(request.userId!, request.body ?? {})); }
}

export const gameController = new GameController();
