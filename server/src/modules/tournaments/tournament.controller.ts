/* Endpoints HTTP pour les tournois côté joueur (le back office aura ses
 * propres endpoints admin plus tard). */
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { tournamentService } from './tournament.service.js';
import { tournamentEconomics, tournamentEconomicsByPosition } from './economics.js';
import { TournamentStatus } from './tournament.model.js';
import { MatchFormat } from '../matches/matchFormat.js';
import { UserModel } from '../user/user.model.js';
import { badRequest } from '../../core/HttpError.js';

function parseStatus(raw: unknown): TournamentStatus | 'all' {
  const s = String(raw ?? 'all');
  if (s === 'all') return 'all';
  if (!Object.values(TournamentStatus).includes(s as TournamentStatus)) throw badRequest(`Statut inconnu : ${raw}`);
  return s as TournamentStatus;
}

/** Récupère le level d'un utilisateur (défaut 0 s'il n'a pas encore joué). */
async function levelOf(userId: string): Promise<number> {
  const u: any = await UserModel.findById(userId).select('level xp').lean();
  return u?.level ?? 0;
}

export class TournamentController {
  async list(request: AuthenticatedRequest, response: Response) {
    const status = parseStatus(request.query?.status);
    // v14.12 — Par défaut on filtre par level du user. Passer ?all=1 pour
    // récupérer tous les tournois (utile pour un futur back office admin).
    const includeAll = request.query?.all === '1';
    const userLevel = includeAll ? undefined : await levelOf(request.userId!);
    response.json({
      tournaments: await tournamentService.listVisible(status === 'all' ? undefined : status, userLevel),
    });
  }

  async getById(request: AuthenticatedRequest, response: Response) {
    response.json({ tournament: await tournamentService.getById(request.params.id, request.userId!) });
  }

  /** v16 — Statut actif du joueur dans un tournoi live (écran d'attente/rejoindre). */
  async mine(request: AuthenticatedRequest, response: Response) {
    response.json({ active: await tournamentService.getMyActive(request.userId!) });
  }

  /** v14.12 — Arbre bracket pour affichage « coupe du monde ». */
  async getBracket(request: AuthenticatedRequest, response: Response) {
    response.json(await tournamentService.getBracket(request.params.id, request.userId!));
  }

  async join(request: AuthenticatedRequest, response: Response) {
    const robotIds: string[] = Array.isArray(request.body?.robotIds) ? request.body.robotIds : [];
    response.json(await tournamentService.join(request.params.id, request.userId!, robotIds));
  }

  async leave(request: AuthenticatedRequest, response: Response) {
    response.json(await tournamentService.leave(request.params.id, request.userId!));
  }

  /** v14.12 — Création d'un tournoi (draft ou publication immédiate). */
  async create(request: AuthenticatedRequest, response: Response) {
    const body = request.body || {};
    if (!body.name || !body.format || !body.capacity || body.entryFee == null || !body.startAt) {
      throw badRequest('Champs requis : name, format, capacity, entryFee, startAt.');
    }
    if (!Object.values(MatchFormat).includes(body.format)) throw badRequest(`Format inconnu : ${body.format}`);
    const startAt = new Date(body.startAt);
    if (isNaN(startAt.getTime())) throw badRequest('startAt invalide.');
    const result = await tournamentService.create(request.userId!, {
      name: String(body.name),
      format: body.format as MatchFormat,
      capacity: Number(body.capacity),
      entryFee: Number(body.entryFee),
      startAt,
      description: body.description ? String(body.description) : undefined,
      color: body.color ? String(body.color) : undefined,
      icon: body.icon ? String(body.icon) : undefined,
      minLevel: body.minLevel != null ? Number(body.minLevel) : undefined,
      maxLevel: body.maxLevel != null ? Number(body.maxLevel) : null,
      prizesByPosition: Array.isArray(body.prizesByPosition) ? body.prizesByPosition : undefined,
      rounds: Array.isArray(body.rounds) ? body.rounds : undefined,
      publishImmediately: body.publishImmediately === true,
    });
    response.json(result);
  }

  /** v14.12 — Publie un tournoi DRAFT → UPCOMING. */
  async publish(request: AuthenticatedRequest, response: Response) {
    response.json(await tournamentService.publish(request.params.id, request.userId!));
  }

  /**
   * Aperçu de rentabilité (aucun effet en base). v14.12 accepte au choix :
   *   • rounds:[]              → économie « legacy »
   *   • prizesByPosition:[]    → économie par position (recommandé)
   */
  async previewEconomics(request: AuthenticatedRequest, response: Response) {
    const capacity = Number(request.body?.capacity ?? 0);
    const entryFee = Number(request.body?.entryFee ?? 0);
    const prizesByPosition = Array.isArray(request.body?.prizesByPosition) ? request.body.prizesByPosition : null;
    if (prizesByPosition && prizesByPosition.length > 0) {
      response.json({ economics: tournamentEconomicsByPosition({ capacity, entryFee, prizesByPosition }) });
      return;
    }
    const rounds = Array.isArray(request.body?.rounds) ? request.body.rounds : [];
    response.json({ economics: tournamentEconomics({ capacity, entryFee, rounds }) });
  }
}

export const tournamentController = new TournamentController();
