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
import { Types } from 'mongoose';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { matchmakingService } from './matchmaking.service.js';
import { matchHeadlessRunner } from '../matches/match.headlessRunner.js';
import { MatchModel } from '../matches/match.model.js';
import { MatchFormat } from '../matches/matchFormat.js';
import { badRequest, notFound } from '../../core/HttpError.js';

function parseFormat(raw: unknown): MatchFormat {
  const s = String(raw ?? '').trim() as MatchFormat;
  if (!Object.values(MatchFormat).includes(s)) throw badRequest(`Format inconnu : ${raw}`);
  return s;
}

/**
 * v16 — Résout l'identifiant de VARIANTE de match rapide depuis le body :
 * `variantId` explicite en priorité ; sinon on retombe sur la 1ʳᵉ variante du
 * `format` fourni (rétrocompatibilité). Lève si rien de valide.
 */
async function resolveVariantId(body: any): Promise<string> {
  if (body?.variantId) return String(body.variantId);
  const format = parseFormat(body?.format);
  const { matchFormatConfigService } = await import('../matches/matchFormatConfig.service.js');
  const raw: any = await matchFormatConfigService.getRaw(format);
  if (!raw?._id) throw badRequest('Aucune variante de match rapide pour ce format.');
  return String(raw._id);
}

export class MatchmakingController {
  async enqueue(request: AuthenticatedRequest, response: Response) {
    const variantId = await resolveVariantId(request.body);
    const robotIds: string[] = Array.isArray(request.body?.robotIds) ? request.body.robotIds : [];
    const result = await matchmakingService.enqueue({ userId: request.userId!, variantId, robotIds });
    response.json(result);
  }

  async cancel(request: AuthenticatedRequest, response: Response) {
    const variantId = await resolveVariantId(request.body);
    response.json(await matchmakingService.cancel(request.userId!, variantId));
  }

  async queues(_request: AuthenticatedRequest, response: Response) {
    response.json({ sizes: await matchmakingService.queueSizes() });
  }

  /**
   * v16 — Liste dynamique des MATCH RAPIDE proposés (config back-office) :
   * mise, gain, manches, score cible, habillage. Le mobile la rend dans un
   * carrousel horizontal (nombre variable selon les formats actifs).
   */
  async formats(request: AuthenticatedRequest, response: Response) {
    const { matchFormatConfigService } = await import('../matches/matchFormatConfig.service.js');
    // Filtre par niveau du joueur : on ne renvoie QUE les formats éligibles.
    const { UserModel } = await import('../user/user.model.js');
    const u: any = await UserModel.findById(request.userId!).select('level').lean();
    const level = u?.level ?? 0;
    const list = await matchFormatConfigService.list(true, level);
    response.json({
      formats: list.map((c: any) => ({
        id: String(c._id), format: c.format, label: c.label, subtitle: c.subtitle,
        buyIn: c.buyInPerPlayer, prize: c.prizePerWinner,
        manches: c.manches, baseTarget: c.baseTarget, labelTarget: c.labelTarget,
        color: c.color, icon: c.icon, order: c.order,
        minLevel: c.minLevel ?? 0, maxLevel: c.maxLevel ?? null,
      })),
    });
  }

  /**
   * Retourne le match en cours ou récemment terminé de l'utilisateur.
   * Utile pour le mobile qui poll après matching pour savoir si un match a
   * été créé pour lui (statut running → aller sur l'écran match ;
   * finished → afficher le résultat).
   */
  async mine(request: AuthenticatedRequest, response: Response) {
    const userId = new Types.ObjectId(request.userId!);
    // Priorité 1 : un match en cours (RUNNING ou PAIRING). Sinon, prendre
    // le plus récent (typiquement FINISHED récent que le mobile affiche
    // pendant ~2 min sur l'accueil).
    let match: any = await MatchModel.findOne({
      'participants.userId': userId,
      status: { $in: ['pairing', 'running'] },
    }).sort({ createdAt: -1 })
      .populate('participants.robotId', 'name mobile owner')
      .lean();
    if (!match) {
      match = await MatchModel.findOne({ 'participants.userId': userId })
        .sort({ createdAt: -1 })
        .populate('participants.robotId', 'name mobile owner')
        .lean();
    }
    response.json({ match: match ?? null });
  }

  async getById(request: AuthenticatedRequest, response: Response) {
    const match = await MatchModel.findById(request.params.id)
      .populate('participants.robotId', 'name mobile owner')
      .populate('participants.userId', 'username')
      .lean();
    if (!match) throw notFound('Match introuvable.');
    response.json({ match });
  }

  /**
   * Récupère (ou crée) la Table éphémère associée à un match non-headless.
   * Le client peut ensuite ouvrir l'écran table classique via `tableId`.
   *
   * Utilisé par le mobile après matching : quand `getMyMatch` renvoie un
   * match en RUNNING de format HYBRID/ROYAL, on appelle cet endpoint pour
   * obtenir le tableId et naviguer vers `table?id=<tableId>`.
   */
  async provisionLiveTable(request: AuthenticatedRequest, response: Response) {
    const { matchLiveService } = await import('../matches/match.liveRunner.js');
    response.json(await matchLiveService.provision(request.params.id));
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
