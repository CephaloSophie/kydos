import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { robotMatchService } from './robotMatch.service.js';
import { gameQueryService } from './gameQuery.service.js';

export class GameController {
  async list(request: AuthenticatedRequest, response: Response) {
    const page = Number(request.query.page ?? 1) || 1;
    const kind = request.query.kind ? String(request.query.kind) : undefined;
    const mode = request.query.mode ? String(request.query.mode) : undefined;
    response.json(await gameQueryService.listForUser(request.userId!, String(request.query.scope ?? 'mine'), { page, kind, mode }));
  }
  async listPublic(request: AuthenticatedRequest, response: Response) {
    response.json({ games: await gameQueryService.listPublicByName(String(request.query.q ?? '')) });
  }
  async getById(request: AuthenticatedRequest, response: Response) { response.json({ game: await gameQueryService.getById(request.params.id, request.userId!) }); }
  async save(request: AuthenticatedRequest, response: Response) { response.json(await gameQueryService.saveLocalGame(request.userId!, request.body ?? {})); }

  /**
   * Partie 100% robots : simulée d'un trait côté serveur (aucune socket), puis
   * archivée dans l'historique. Renvoie { gameId, winner, scoreA, scoreB }.
   */
  async simulateRobots(request: AuthenticatedRequest, response: Response) {
    const body = request.body ?? {};
    const result = await robotMatchService.simulate({
      robotIds: Array.isArray(body.robotIds) ? body.robotIds.map(String) : [],
      ownerId: request.userId!,
      teamId: body.forTeam ? String(body.forTeam) : null,
      visibility: body.visibility === 'public' ? 'public' : 'private',
      manches: [1, 2, 4].includes(body.manches) ? body.manches : 2,
    });
    response.json(result);
  }
}

export const gameController = new GameController();
