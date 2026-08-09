/* =============================================================================
 * MATCHMAKING · matchmaking.service.ts — Regroupement des joueurs par format.
 * -----------------------------------------------------------------------------
 * Flux à l'inscription :
 *   1. Vérifier l'éligibilité (robots existent, appartiennent à l'utilisateur,
 *      solde suffisant).
 *   2. Débiter le buy-in (walletService.stake).
 *   3. Pousser un ticket dans la file du format concerné.
 *   4. Vérifier si la file contient assez de tickets pour créer un match : si
 *      oui, extraire les N tickets tête et créer le Match en base.
 *
 * Le lancement effectif du match (partie belote) est délégué au runner adapté
 * au format (headless pour DUO_STEEL, temps réel pour les autres). Ce service
 * ne se charge QUE du matching — la séparation des responsabilités est claire.
 * ========================================================================== */
import { Types } from 'mongoose';
import { MatchFormat, getMatchFormatRules } from '../matches/matchFormat.js';
import { MatchModel, MatchStatus } from '../matches/match.model.js';
import { walletService } from '../wallet/wallet.service.js';
import { RobotModel } from '../robot/robot.model.js';
import { UserModel } from '../user/user.model.js';
import { badRequest, notFound } from '../../core/HttpError.js';
import { getMatchmakingQueue } from './queueFactory.js';
import type { MatchmakingTicket } from './queue.js';

export interface EnqueueRequest {
  userId: string;
  format: MatchFormat;
  robotIds: string[];   // vide pour ROYAL_SQUARE, 1 pour HYBRID_ALLIANCE, 2 pour DUO_STEEL
}

export interface EnqueueResult {
  status: 'queued' | 'matched';
  matchId?: string;
  queuePosition?: number;
}

export class MatchmakingService {
  /**
   * Inscrit un joueur en file d'attente. Si la file atteint l'effectif requis,
   * un match est créé immédiatement et son id est renvoyé.
   */
  async enqueue(req: EnqueueRequest): Promise<EnqueueResult> {
    const rules = getMatchFormatRules(req.format);

    // Vérifications d'éligibilité
    if (req.robotIds.length !== rules.robotsPerPlayer) {
      throw badRequest(`Ce format exige ${rules.robotsPerPlayer} robot(s) par joueur.`);
    }
    const uniqueRobots = new Set(req.robotIds);
    if (uniqueRobots.size !== req.robotIds.length) throw badRequest('Les robots doivent être distincts.');

    // Robots appartiennent-ils au joueur ?
    if (req.robotIds.length > 0) {
      const owned = await RobotModel.countDocuments({ _id: { $in: req.robotIds }, owner: req.userId });
      if (owned !== req.robotIds.length) throw badRequest('Un robot au moins ne vous appartient pas.');
    }

    // L'utilisateur est-il déjà en file pour ce format ?
    const queue = getMatchmakingQueue();
    const already = await queue.size(req.format);
    // On lit la liste pour vérifier (petit coût, files courtes).
    const existing = await this.#peekAll(req.format);
    if (existing.some((t) => t.userId === req.userId)) {
      throw badRequest('Vous êtes déjà en file pour ce format.');
    }

    // Débit du buy-in (tout ou rien).
    await walletService.stake(req.userId, rules.buyInPerPlayer);

    // Ajout à la file.
    const ticket: MatchmakingTicket = { userId: req.userId, robotIds: req.robotIds, enqueuedAt: Date.now() };
    await queue.push(req.format, ticket);

    // Essai d'appariement.
    const matched = await this.#tryMatch(req.format);
    if (matched) return { status: 'matched', matchId: matched };
    return { status: 'queued', queuePosition: already + 1 };
  }

  /** Annule une inscription en file (remboursement). Sans effet si le match est déjà lancé. */
  async cancel(userId: string, format: MatchFormat): Promise<{ refunded: number }> {
    const rules = getMatchFormatRules(format);
    const queue = getMatchmakingQueue();
    const removed = await queue.remove(format, userId);
    if (!removed) throw notFound('Aucune inscription en file pour ce format.');
    await walletService.credit(userId, rules.buyInPerPlayer, undefined, 'refund');
    return { refunded: rules.buyInPerPlayer };
  }

  /** Récupère la file (sans dépiler). */
  async #peekAll(format: MatchFormat): Promise<MatchmakingTicket[]> {
    // L'interface ne définit pas de peek : on pop puis on re-push l'ordre est
    // préservé (le pop renvoie les plus anciens en tête). Pour éviter de
    // vider la file par erreur, on ne fait ça QUE si nécessaire.
    const queue = getMatchmakingQueue();
    const size = await queue.size(format);
    if (size === 0) return [];
    const items = await queue.pop(format, size);
    for (const t of items) await queue.push(format, t);
    return items;
  }

  /** Extrait les N joueurs de tête et crée un Match, si l'effectif est atteint. */
  async #tryMatch(format: MatchFormat): Promise<string | null> {
    const rules = getMatchFormatRules(format);
    const queue = getMatchmakingQueue();
    if ((await queue.size(format)) < rules.humansPerMatch) return null;

    const tickets = await queue.pop(format, rules.humansPerMatch);
    if (tickets.length < rules.humansPerMatch) {
      // Concurrence : quelqu'un est passé avant nous. On re-push nos tickets.
      for (const t of tickets) await queue.push(format, t);
      return null;
    }

    // Construction des participants.
    const participants = this.#buildParticipants(format, tickets);
    const match = await MatchModel.create({
      format,
      status: MatchStatus.PAIRING,
      participants,
      queuedAt: new Date(),
      startedAt: null,
    });
    return String(match._id);
  }

  /**
   * Distribue les joueurs sur les 4 sièges selon le format.
   *   • DUO_STEEL       : joueur1 → sièges 0,2 (équipe A) avec ses 2 robots ;
   *                       joueur2 → sièges 1,3 (équipe B) avec ses 2 robots.
   *   • HYBRID_ALLIANCE : joueur1 en 0 + son robot en 2 (équipe A) ;
   *                       joueur2 en 1 + son robot en 3 (équipe B).
   *   • ROYAL_SQUARE    : 4 humains, tickets[0]→0, tickets[1]→1, tickets[2]→2, tickets[3]→3.
   *                       Équipes : sièges 0,2 = A ; 1,3 = B.
   */
  #buildParticipants(format: MatchFormat, tickets: MatchmakingTicket[]) {
    const p: Array<{ seat: number; userId: Types.ObjectId | null; robotId: Types.ObjectId | null; team: 'A' | 'B'; isHuman: boolean }> = [];
    const asId = (id: string) => new Types.ObjectId(id);
    if (format === MatchFormat.DUO_STEEL) {
      // équipe A = tickets[0], équipe B = tickets[1]. Aucun humain assis, les
      // robots occupent les 4 sièges, mais on note userId côté propriétaire.
      p.push({ seat: 0, userId: asId(tickets[0].userId), robotId: asId(tickets[0].robotIds[0]), team: 'A', isHuman: false });
      p.push({ seat: 2, userId: asId(tickets[0].userId), robotId: asId(tickets[0].robotIds[1]), team: 'A', isHuman: false });
      p.push({ seat: 1, userId: asId(tickets[1].userId), robotId: asId(tickets[1].robotIds[0]), team: 'B', isHuman: false });
      p.push({ seat: 3, userId: asId(tickets[1].userId), robotId: asId(tickets[1].robotIds[1]), team: 'B', isHuman: false });
    } else if (format === MatchFormat.HYBRID_ALLIANCE) {
      p.push({ seat: 0, userId: asId(tickets[0].userId), robotId: null, team: 'A', isHuman: true });
      p.push({ seat: 2, userId: asId(tickets[0].userId), robotId: asId(tickets[0].robotIds[0]), team: 'A', isHuman: false });
      p.push({ seat: 1, userId: asId(tickets[1].userId), robotId: null, team: 'B', isHuman: true });
      p.push({ seat: 3, userId: asId(tickets[1].userId), robotId: asId(tickets[1].robotIds[0]), team: 'B', isHuman: false });
    } else {
      // ROYAL_SQUARE : 4 humains.
      p.push({ seat: 0, userId: asId(tickets[0].userId), robotId: null, team: 'A', isHuman: true });
      p.push({ seat: 1, userId: asId(tickets[1].userId), robotId: null, team: 'B', isHuman: true });
      p.push({ seat: 2, userId: asId(tickets[2].userId), robotId: null, team: 'A', isHuman: true });
      p.push({ seat: 3, userId: asId(tickets[3].userId), robotId: null, team: 'B', isHuman: true });
    }
    return p;
  }

  /** Retourne la taille de chaque file (debug / affichage utilisateur). */
  async queueSizes(): Promise<Record<MatchFormat, number>> {
    const queue = getMatchmakingQueue();
    const out = {} as Record<MatchFormat, number>;
    for (const format of Object.values(MatchFormat)) out[format] = await queue.size(format);
    return out;
  }
}

export const matchmakingService = new MatchmakingService();
