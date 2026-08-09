/* Endpoints HTTP pour les tournois côté joueur (le back office aura ses
 * propres endpoints admin plus tard). */
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { tournamentService } from './tournament.service.js';
import { tournamentEconomics } from './economics.js';
import { TournamentStatus } from './tournament.model.js';
import { badRequest } from '../../core/HttpError.js';

function parseStatus(raw: unknown): TournamentStatus | 'all' {
  const s = String(raw ?? 'all');
  if (s === 'all') return 'all';
  if (!Object.values(TournamentStatus).includes(s as TournamentStatus)) throw badRequest(`Statut inconnu : ${raw}`);
  return s as TournamentStatus;
}

export class TournamentController {
  async list(request: AuthenticatedRequest, response: Response) {
    const status = parseStatus(request.query?.status);
    response.json({ tournaments: await tournamentService.listVisible(status === 'all' ? undefined : status) });
  }

  async getById(request: AuthenticatedRequest, response: Response) {
    response.json({ tournament: await tournamentService.getById(request.params.id, request.userId!) });
  }

  async join(request: AuthenticatedRequest, response: Response) {
    const robotIds: string[] = Array.isArray(request.body?.robotIds) ? request.body.robotIds : [];
    response.json(await tournamentService.join(request.params.id, request.userId!, robotIds));
  }

  async leave(request: AuthenticatedRequest, response: Response) {
    response.json(await tournamentService.leave(request.params.id, request.userId!));
  }

  /**
   * Calcule (côté serveur, aperçu) la rentabilité d'un tournoi à partir des
   * paramètres passés en query. Ne modifie rien — utile pour le futur back
   * office pendant la saisie.
   */
  async previewEconomics(request: AuthenticatedRequest, response: Response) {
    const capacity = Number(request.body?.capacity ?? 0);
    const entryFee = Number(request.body?.entryFee ?? 0);
    const rounds = Array.isArray(request.body?.rounds) ? request.body.rounds : [];
    response.json({ economics: tournamentEconomics({ capacity, entryFee, rounds }) });
  }
}

export const tournamentController = new TournamentController();
