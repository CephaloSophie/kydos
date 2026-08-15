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

    // Vérifications d'éligibilité — v14.5 : robotIds = [co-équipiers..., remplaçant?]
    const expected = rules.robotsPerPlayer + (rules.requiresSubstitute ? 1 : 0);
    if (req.robotIds.length !== expected) {
      throw badRequest(rules.requiresSubstitute
        ? `Ce format exige ${rules.robotsPerPlayer} co\u00e9quipier(s) + 1 rempla\u00e7ant.`
        : `Ce format exige ${rules.robotsPerPlayer} robot(s) par joueur.`);
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
    const existing = await queue.peek(req.format);
    const alreadyIndex = existing.findIndex((t) => t.userId === req.userId);
    if (alreadyIndex >= 0) {
      // Idempotence : ne pas re-débiter, ne pas ré-inscrire, mais renvoyer
      // le même contrat que si tout venait de se faire. Le client sait alors
      // qu'il est en file et bascule sur l'écran waiting sans erreur.
      return { status: 'queued', queuePosition: alreadyIndex + 1 };
    }

    // Débit du buy-in (tout ou rien).
    await walletService.stake(req.userId, rules.buyInPerPlayer);

    // Ajout à la file. Le ticket transporte les robots dans l'ordre
    // [coéquipier(s)…, remplaçant?]. Le buildParticipants les affectera.
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
    const matchId = String(match._id);

    // Lancement automatique :
    //   - DUO_STEEL (headless) : joué en synchrone dans un worker background.
    //   - HYBRID_ALLIANCE / ROYAL_SQUARE : provisionne une Table éphémère et
    //     laisse liveGameService démarrer dès que les joueurs se connectent.
    if (rules.isHeadless) {
      void this.#runHeadlessInBackground(matchId);
    } else {
      // Fire-and-forget aussi pour ne pas bloquer la réponse HTTP.
      void this.#provisionLiveTableInBackground(matchId);
    }

    return matchId;
  }

  /** Lance le runner headless en arrière-plan (import dynamique pour éviter les cycles). */
  async #runHeadlessInBackground(matchId: string): Promise<void> {
    try {
      const { matchHeadlessRunner } = await import('../matches/match.headlessRunner.js');
      await matchHeadlessRunner.run(matchId, { manches: 2 });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[matchmaking] échec du runner headless ${matchId}:`, e);
    }
  }

  /** Provisionne la Table éphémère et met le Match en RUNNING (les joueurs peuvent rejoindre). */
  async #provisionLiveTableInBackground(matchId: string): Promise<void> {
    try {
      const { matchLiveService } = await import('../matches/match.liveRunner.js');
      await matchLiveService.provision(matchId);
      // Passe le match en RUNNING dès que la table est prête. Les joueurs
      // peuvent se connecter ; liveGameService.launch se déclenchera quand
      // tous les sièges seront présents (ou après un timeout de grâce).
      await MatchModel.updateOne({ _id: matchId }, { $set: { status: MatchStatus.RUNNING, startedAt: new Date() } });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[matchmaking] provisionnement live-table ${matchId} échoué :`, e);
    }
  }

  /**
   * Distribue les joueurs sur les 4 sièges selon le format.
   *   • DUO_STEEL       : robotIds = [teammate1, teammate2] (2 co-équipiers).
   *                       joueur1 → sièges 0,2 (équipe A) ; joueur2 → sièges 1,3 (B).
   *   • HYBRID_ALLIANCE : robotIds = [coéquipier, remplaçant].
   *                       joueur1 en 0 + coéquipier en 2 (équipe A) ; joueur2 idem (B).
   *                       Le remplaçant est stocké sur le participant humain.
   *   • ROYAL_SQUARE    : robotIds = [remplaçant].
   *                       4 humains, chaque humain a son remplaçant enregistré.
   */
  #buildParticipants(format: MatchFormat, tickets: MatchmakingTicket[]) {
    type Row = { seat: number; userId: Types.ObjectId | null; robotId: Types.ObjectId | null; substituteRobotId: Types.ObjectId | null; team: 'A' | 'B'; isHuman: boolean };
    const p: Row[] = [];
    const asId = (id: string) => new Types.ObjectId(id);
    const rules = getMatchFormatRules(format);
    const substituteOf = (t: MatchmakingTicket): Types.ObjectId | null => {
      if (!rules.requiresSubstitute) return null;
      const last = t.robotIds[t.robotIds.length - 1];
      return last ? asId(last) : null;
    };

    if (format === MatchFormat.DUO_STEEL) {
      // Pas d'humain assis, pas de substitute. tickets[i].robotIds = [r1, r2].
      p.push({ seat: 0, userId: asId(tickets[0].userId), robotId: asId(tickets[0].robotIds[0]), substituteRobotId: null, team: 'A', isHuman: false });
      p.push({ seat: 2, userId: asId(tickets[0].userId), robotId: asId(tickets[0].robotIds[1]), substituteRobotId: null, team: 'A', isHuman: false });
      p.push({ seat: 1, userId: asId(tickets[1].userId), robotId: asId(tickets[1].robotIds[0]), substituteRobotId: null, team: 'B', isHuman: false });
      p.push({ seat: 3, userId: asId(tickets[1].userId), robotId: asId(tickets[1].robotIds[1]), substituteRobotId: null, team: 'B', isHuman: false });
    } else if (format === MatchFormat.HYBRID_ALLIANCE) {
      // tickets[i].robotIds = [coéquipier, remplaçant].
      p.push({ seat: 0, userId: asId(tickets[0].userId), robotId: null, substituteRobotId: substituteOf(tickets[0]), team: 'A', isHuman: true });
      p.push({ seat: 2, userId: asId(tickets[0].userId), robotId: asId(tickets[0].robotIds[0]), substituteRobotId: null, team: 'A', isHuman: false });
      p.push({ seat: 1, userId: asId(tickets[1].userId), robotId: null, substituteRobotId: substituteOf(tickets[1]), team: 'B', isHuman: true });
      p.push({ seat: 3, userId: asId(tickets[1].userId), robotId: asId(tickets[1].robotIds[0]), substituteRobotId: null, team: 'B', isHuman: false });
    } else {
      // ROYAL_SQUARE : tickets[i].robotIds = [remplaçant].
      p.push({ seat: 0, userId: asId(tickets[0].userId), robotId: null, substituteRobotId: substituteOf(tickets[0]), team: 'A', isHuman: true });
      p.push({ seat: 1, userId: asId(tickets[1].userId), robotId: null, substituteRobotId: substituteOf(tickets[1]), team: 'B', isHuman: true });
      p.push({ seat: 2, userId: asId(tickets[2].userId), robotId: null, substituteRobotId: substituteOf(tickets[2]), team: 'A', isHuman: true });
      p.push({ seat: 3, userId: asId(tickets[3].userId), robotId: null, substituteRobotId: substituteOf(tickets[3]), team: 'B', isHuman: true });
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
