/* =============================================================================
 * MATCHMAKING · matchmaking.controller.ts — Endpoints HTTP.
 * -----------------------------------------------------------------------------
 * Surface REST minimale pour l'inscription en file d'attente :
 *   POST /matches/enqueue    — inscription au format spécifié
 *   POST /matches/cancel     — annulation (remboursement)
 *   GET  /matches/queues     — tailles des files par format
 *   POST /matches/:id/run    — déclenche l'exécution d'un match DUO_STEEL prêt
 *
 * La logique métier est dans matchmaking.service et match.headlessRunner.
 * ========================================================================== */
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { matchmakingService } from './matchmaking.service.js';
import { matchHeadlessRunner } from '../matches/match.headlessRunner.js';
import { MatchFormat } from '../matches/matchFormat.js';
import { badRequest } from '../../core/HttpError.js';

function parseFormat(raw: unknown): MatchFormat {
  const s = String(raw ?? '').trim() as MatchFormat;
  if (!Object.values(MatchFormat).includes(s)) throw badRequest(`Format inconnu : ${raw}`);
  return s;
}

export class MatchmakingController {
  async enqueue(request: AuthenticatedRequest, response: Response) {
    const format = parseFormat(request.body?.format);
    const robotIds: string[] = Array.isArray(request.body?.robotIds) ? request.body.robotIds : [];
    const result = await matchmakingService.enqueue({ userId: request.userId!, format, robotIds });
    response.json(result);
  }

  async cancel(request: AuthenticatedRequest, response: Response) {
    const format = parseFormat(request.body?.format);
    response.json(await matchmakingService.cancel(request.userId!, format));
  }

  async queues(_request: AuthenticatedRequest, response: Response) {
    response.json({ sizes: await matchmakingService.queueSizes() });
  }

  /**
   * Déclenche l'exécution headless d'un match DUO_STEEL prêt à jouer. En
   * production, un worker en arrière-plan appellerait cette méthode dès qu'un
   * match passe en PAIRING ; l'endpoint HTTP existe pour les tests et
   * l'exploitation manuelle.
   */
  async runHeadless(request: AuthenticatedRequest, response: Response) {
    const { id } = request.params;
    const manches = ([1, 2, 4].includes(Number(request.body?.manches)) ? Number(request.body?.manches) : 2) as 1 | 2 | 4;
    response.json(await matchHeadlessRunner.run(id, { manches }));
  }
}

export const matchmakingController = new MatchmakingController();
