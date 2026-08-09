/* =============================================================================
 * TOURNAMENTS · tournament.service.ts — Inscription / désinscription / démarrage.
 * -----------------------------------------------------------------------------
 * Règles clés :
 *   • On ne peut s'inscrire ou se désinscrire QUE si status=UPCOMING.
 *   • Le débit du buy-in est atomique (wallet.stake) et remboursable.
 *   • CONTRAINTE 1 tournoi/robot/jour : garantie par l'index unique
 *     {robotId, dayKey} sur TournamentRobotDayLock. Cet insert échoue si le
 *     robot est déjà engagé aujourd'hui → on refuse l'inscription.
 *   • Aucune modification une fois LIVE. Le worker de démarrage (T13) verrouille
 *     le tournoi et lance le bracket.
 * ========================================================================== */
import { Types } from 'mongoose';
import { TournamentModel, TournamentStatus, TournamentRobotDayLockModel, dayKeyUTC } from './tournament.model.js';
import { getMatchFormatRules, type MatchFormat } from '../matches/matchFormat.js';
import { walletService } from '../wallet/wallet.service.js';
import { RobotModel } from '../robot/robot.model.js';
import { houseAccountingService } from '../houseAccounting/houseAccounting.service.js';
import { badRequest, notFound, forbidden } from '../../core/HttpError.js';

export class TournamentService {
  /** Liste des tournois visibles pour un joueur (jamais draft). */
  async listVisible(status?: TournamentStatus | 'all'): Promise<any[]> {
    const query: any = { status: { $ne: TournamentStatus.DRAFT } };
    if (status && status !== 'all') query.status = status;
    return TournamentModel.find(query).sort({ startAt: 1 }).lean();
  }

  /** Détail d'un tournoi (draft visible seulement à son créateur). */
  async getById(tournamentId: string, requesterId: string): Promise<any> {
    const doc = await TournamentModel.findById(tournamentId).lean();
    if (!doc) throw notFound('Tournoi introuvable.');
    const isCreator = String((doc as any).createdBy) === String(requesterId);
    if ((doc as any).status === TournamentStatus.DRAFT && !isCreator) throw notFound('Tournoi introuvable.');
    return doc;
  }

  /** Inscription d'un joueur avec ses robots (nombre selon format). */
  async join(tournamentId: string, userId: string, robotIds: string[]): Promise<{ joined: true }> {
    const t = await TournamentModel.findById(tournamentId);
    if (!t) throw notFound('Tournoi introuvable.');
    if (t.status !== TournamentStatus.UPCOMING) throw badRequest('Les inscriptions sont ferm\u00e9es.');
    if (t.participants.length >= t.capacity) throw badRequest('Tournoi complet.');

    const rules = getMatchFormatRules(t.format as MatchFormat);
    if (robotIds.length !== rules.robotsPerPlayer) {
      throw badRequest(`Ce format exige ${rules.robotsPerPlayer} robot(s) par joueur.`);
    }
    const uniqueRobots = new Set(robotIds);
    if (uniqueRobots.size !== robotIds.length) throw badRequest('Les robots doivent \u00eatre distincts.');

    // Robots appartiennent-ils au joueur ?
    if (robotIds.length > 0) {
      const owned = await RobotModel.countDocuments({ _id: { $in: robotIds }, owner: userId });
      if (owned !== robotIds.length) throw badRequest('Un robot au moins ne vous appartient pas.');
    }

    // Déjà inscrit ?
    if (t.participants.some((p: any) => String(p.userId) === String(userId))) {
      throw badRequest('Vous \u00eates d\u00e9j\u00e0 inscrit \u00e0 ce tournoi.');
    }

    // Contrainte 1 tournoi/robot/jour : on tente d'insérer les locks.
    const dayKey = dayKeyUTC(t.startAt);
    const locks = robotIds.map((robotId) => ({
      robotId: new Types.ObjectId(robotId), dayKey, tournamentId: t._id, userId: new Types.ObjectId(userId),
    }));
    try {
      if (locks.length > 0) await TournamentRobotDayLockModel.insertMany(locks, { ordered: true });
    } catch (e: any) {
      // Duplicate key = un robot est déjà engagé ce jour-là.
      if (e?.code === 11000) throw badRequest('Un de vos robots est d\u00e9j\u00e0 engag\u00e9 dans un tournoi ce jour-l\u00e0.');
      throw e;
    }

    // Débit du buy-in.
    try {
      await walletService.stake(userId, t.entryFee);
    } catch (e) {
      // Rollback des locks si le débit échoue.
      await TournamentRobotDayLockModel.deleteMany({ robotId: { $in: robotIds }, dayKey, tournamentId: t._id });
      throw e;
    }

    // Enregistre le buy-in côté comptabilité kydos.
    await houseAccountingService.recordTournamentEntry(t._id, userId, t.entryFee);

    // Enregistre la participation.
    t.participants.push({
      userId: new Types.ObjectId(userId),
      robotIds: robotIds.map((r) => new Types.ObjectId(r)),
      seedIndex: null,
      eliminatedAtRound: null,
      joinedAt: new Date(),
    } as any);
    await t.save();

    return { joined: true };
  }

  /** Désinscription (autorisée seulement en UPCOMING). Rembourse le buy-in. */
  async leave(tournamentId: string, userId: string): Promise<{ refunded: number }> {
    const t = await TournamentModel.findById(tournamentId);
    if (!t) throw notFound('Tournoi introuvable.');
    if (t.status !== TournamentStatus.UPCOMING) throw badRequest('Impossible de quitter un tournoi d\u00e9marr\u00e9.');

    const index = t.participants.findIndex((p: any) => String(p.userId) === String(userId));
    if (index < 0) throw notFound('Vous n\u2019\u00eates pas inscrit \u00e0 ce tournoi.');

    // Libère les locks robots.
    const dayKey = dayKeyUTC(t.startAt);
    const robotIds = t.participants[index].robotIds.map((r: any) => String(r));
    if (robotIds.length > 0) {
      await TournamentRobotDayLockModel.deleteMany({ robotId: { $in: robotIds }, dayKey, tournamentId: t._id });
    }

    // Remboursement.
    await walletService.credit(userId, t.entryFee, undefined, 'refund');

    // Contre-écriture de l'entrée en comptabilité (amount négatif).
    await houseAccountingService.recordTournamentEntry(t._id, userId, -t.entryFee);

    // Retire le participant.
    t.participants.splice(index, 1);
    await t.save();

    return { refunded: t.entryFee };
  }

  /**
   * Passe un tournoi en LIVE : verrouille les inscriptions, seed FIFO
   * (ordre joinedAt), initialise le bracket vide. Le worker de démarrage
   * (T13) appellera cette méthode à startAt.
   */
  async startNow(tournamentId: string, admin: { id: string }): Promise<void> {
    const t = await TournamentModel.findById(tournamentId);
    if (!t) throw notFound('Tournoi introuvable.');
    if (String((t as any).createdBy) !== String(admin.id)) throw forbidden('Seul le cr\u00e9ateur peut d\u00e9marrer un tournoi.');
    if (t.status !== TournamentStatus.UPCOMING) throw badRequest('Le tournoi n\u2019est pas en attente.');

    // Seed FIFO : ordre d'inscription.
    t.participants.sort((a: any, b: any) => a.joinedAt.getTime() - b.joinedAt.getTime());
    t.participants.forEach((p: any, i: number) => { p.seedIndex = i; });

    t.status = TournamentStatus.LIVE;
    t.startedAt = new Date();
    t.bracket = [];
    await t.save();
  }

  /** Passe un tournoi en FINISHED (appelé par l'orchestrateur quand tous les rounds sont joués). */
  async markFinished(tournamentId: string, winnersUserIds: string[]): Promise<void> {
    const t = await TournamentModel.findById(tournamentId);
    if (!t) throw notFound('Tournoi introuvable.');
    if (t.status !== TournamentStatus.LIVE) throw badRequest('Tournoi non actif.');
    t.status = TournamentStatus.FINISHED;
    t.finishedAt = new Date();
    t.winners = winnersUserIds.map((id) => new Types.ObjectId(id));
    await t.save();
  }
}

export const tournamentService = new TournamentService();
