/* =============================================================================
 * MATCHES · match.liveRunner.ts — Runner temps-réel pour HYBRID / ROYAL.
 * -----------------------------------------------------------------------------
 * Stratégie : convertit un Match en Table éphémère et délègue toute la boucle
 * temps-réel à `liveGameService` (déjà éprouvé sur les tables libres).
 * ZÉRO duplication de code moteur.
 *
 * Cycle de vie :
 *   1. Match PAIRING + non-headless → `provision(matchId)` crée une Table
 *      privée avec 4 sièges pré-remplis (2 humains + 2 robots pour HYBRID,
 *      4 humains pour ROYAL).
 *   2. Le Match retient le tableId associé.
 *   3. Le mobile navigue vers l'écran table classique (`table?id=<tableId>`)
 *      qui souscrit au socket `table:*` habituel.
 *   4. `liveGameService.launch` démarre la session dès que la table est
 *      complète.
 *   5. À la fin (`table:finished`), un hook copie le résultat dans le Match
 *      (score, winnerTeam, gameId), crédite les gagnants et enregistre le
 *      rake maison. La Table est marquée `finished` (pas supprimée pour
 *      garder l'historique).
 *
 * Le résultat est totalement compatible avec :
 *   - `MatchmakingScreen` (polling /matches/mine détecte le finished).
 *   - `TournamentScreen` (l'orchestrateur lit le winnerTeam pour éliminer).
 *   - L'historique / replays existants (via Game archivée).
 * ========================================================================== */
import { Types } from 'mongoose';
import type { Server } from 'socket.io';
import { MatchModel, MatchStatus } from './match.model.js';
import { MatchFormat, getMatchFormatRules } from './matchFormat.js';
import { TableModel } from '../table/table.model.js';
import { UserModel } from '../user/user.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { liveGameService } from '../game/liveGame.service.js';
import { walletService } from '../wallet/wallet.service.js';
import { houseAccountingService } from '../houseAccounting/houseAccounting.service.js';
import { createLogger } from '../../core/logger.js';

const log = createLogger('match-live');

/** Mappe les 3 MatchFormat vers les 3 kinds de Table. */
const FORMAT_TO_KIND = {
  [MatchFormat.DUO_STEEL]: 'acier',
  [MatchFormat.HYBRID_ALLIANCE]: 'hybride',
  [MatchFormat.ROYAL_SQUARE]: 'royal',
} as const;

export class MatchLiveService {
  /** Cache : matchId → tableId (évite de recréer une table à chaque appel). */
  #tableByMatch = new Map<string, string>();

  /**
   * Crée (ou récupère) la Table éphémère associée à un Match non-headless
   * en PAIRING. Retourne le tableId à ouvrir côté client.
   */
  async provision(matchId: string): Promise<{ tableId: string }> {
    const cached = this.#tableByMatch.get(matchId);
    if (cached) return { tableId: cached };

    const match = await MatchModel.findById(matchId);
    if (!match) throw new Error(`Match introuvable : ${matchId}`);
    const format = match.format as MatchFormat;
    const rules = getMatchFormatRules(format);
    if (rules.isHeadless) throw new Error('Ce format est headless (pas de table).');
    if (![MatchStatus.PAIRING, MatchStatus.RUNNING].includes(match.status as any)) {
      throw new Error(`Match dans un statut incompatible : ${match.status}`);
    }

    // Résolution des usernames et noms robots pour préremplir les sièges.
    const userIds = match.participants.filter((p: any) => p.isHuman).map((p: any) => p.userId);
    const robotIds = match.participants.filter((p: any) => p.robotId).map((p: any) => p.robotId);
    const users = await UserModel.find({ _id: { $in: userIds } }).select('username').lean();
    const robots = await RobotModel.find({ _id: { $in: robotIds } }).select('name').lean();
    const userNames = new Map(users.map((u: any) => [String(u._id), u.username]));
    const robotNames = new Map(robots.map((r: any) => [String(r._id), r.name]));

    // Construction des 4 sièges depuis les participants.
    const seats = match.participants
      .sort((a: any, b: any) => a.seat - b.seat)
      .map((p: any) => ({
        index: p.seat,
        kind: (p.isHuman ? 'human' : 'robot') as 'human' | 'robot',
        user: p.isHuman ? p.userId : null,
        robot: p.robotId ?? null,
        ownerId: p.userId,   // pour l'affichage propriétaire (Duo d'acier)
        name: p.isHuman
          ? (userNames.get(String(p.userId)) ?? 'Joueur')
          : (robotNames.get(String(p.robotId)) ?? 'Robot'),
      }));

    // Choix du propriétaire de la table : le premier humain, ou faute de
    // mieux le premier participant. La table est privée et éphémère.
    const owner = match.participants.find((p: any) => p.isHuman)?.userId
      ?? match.participants[0]?.userId;

    const table = await TableModel.create({
      status: 'lobby',
      kind: FORMAT_TO_KIND[format],
      ownerType: 'user',
      owner,
      visibility: 'private',
      seats,
      config: {
        manches: 2,
        maxPlayers: 4,
        allowSpectators: true,     // 10 max géré par table.socket
        turnTimeoutMs: 15_000,
      },
      startsAt: new Date(),
      lastActivityAt: new Date(),
    });

    const tableId = String(table._id);
    this.#tableByMatch.set(matchId, tableId);

    // Lien retour : le Match référence la Table (utile pour reprendre).
    (match as any).liveTableId = table._id;
    await match.save();

    // Cache les substituteRobotId par siège pour cette table. Ils seront
    // appliqués par attachSubstitutesForTable() dès que la partie live est
    // démarrée (au premier subscribe socket qui déclenche liveGameService.launch).
    const subsBySeat = new Map<number, string>();
    for (const p of match.participants as any[]) {
      if (p.isHuman && p.substituteRobotId) {
        subsBySeat.set(p.seat, String(p.substituteRobotId));
      }
    }
    if (subsBySeat.size > 0) this.#substituteConfig.set(tableId, subsBySeat);

    log.info('table éphémère créée', { matchId, tableId, format, subs: subsBySeat.size });

    // v14.6 : démarrage IMMÉDIAT si le socket server est disponible — évite
    // d'attendre le sweep 3s. Le fallback (sweep) reste en place au cas où.
    try {
      const { getSocketServer } = await import('../../core/socketAccessor.js');
      const server = getSocketServer();
      if (server && !liveGameService.isLive(tableId)) {
        await liveGameService.launch(server, tableId);
        // Attache les remplaçants tout de suite après le launch.
        for (const [seat, robotId] of subsBySeat) {
          try { await liveGameService.setSubstituteBrainForSeat(tableId, seat, robotId); }
          catch { /* silencieux, le sweep retentera */ }
        }
        this.#substituteConfig.delete(tableId);
        log.info('table Match démarrée immédiatement', { matchId, tableId });
      }
    } catch (e) {
      log.warn('démarrage immédiat échoué (sweep fera fallback)', { matchId, error: (e as Error).message });
    }

    return { tableId };
  }

  /**
   * v14.5 — Cache des remplaçants par table. Consommé par
   * `attachSubstitutesForTable()` que le sweep appelle après le launch.
   */
  #substituteConfig = new Map<string, Map<number, string>>();

  /**
   * Démarre proactivement les Tables éphémères issues d'un Match : quand
   * `provision()` les crée, elles restent en `lobby`. `table:subscribe` ne
   * déclenche pas `launch` — on le fait ici via `liveGameService.launch`.
   * Une fois live, `attachPendingSubstitutes()` connectera les remplaçants.
   */
  async launchPendingMatchTables(server: Server): Promise<void> {
    // 1) Cache mémoire (matches provisionnés dans cette instance).
    for (const [matchId, tableId] of this.#tableByMatch) {
      if (liveGameService.isLive(tableId)) continue;
      const finished = await liveGameService.finishedInfo(tableId);
      if (finished) continue;
      try {
        await liveGameService.launch(server, tableId);
        log.info('table Match démarrée (cache)', { matchId, tableId });
      } catch (e) {
        log.warn('launch table Match échoué', { matchId, tableId, error: (e as Error).message });
      }
    }
    // 2) Fallback base : matches RUNNING non-headless avec une liveTableId
    //    mais pas encore live (utile après un redémarrage serveur).
    const running = await MatchModel.find({
      status: MatchStatus.RUNNING,
      format: { $in: [MatchFormat.HYBRID_ALLIANCE, MatchFormat.ROYAL_SQUARE] },
      liveTableId: { $ne: null },
    }).select('_id liveTableId').limit(20).lean();
    for (const m of running) {
      const tableId = String((m as any).liveTableId);
      const matchId = String((m as any)._id);
      if (this.#tableByMatch.get(matchId) === tableId) continue;   // déjà traité
      if (liveGameService.isLive(tableId)) { this.#tableByMatch.set(matchId, tableId); continue; }
      const finished = await liveGameService.finishedInfo(tableId);
      if (finished) continue;
      try {
        await liveGameService.launch(server, tableId);
        this.#tableByMatch.set(matchId, tableId);
        log.info('table Match démarrée (DB)', { matchId, tableId });
      } catch { /* résilience */ }
    }
  }

  /**
   * À appeler périodiquement (via le sweep du socket) : détecte les tables
   * live pour lesquelles des remplaçants sont en attente de configuration et
   * les branche sur liveGameService.
   */
  async attachPendingSubstitutes(): Promise<void> {
    for (const [tableId, subs] of this.#substituteConfig) {
      if (!liveGameService.isLive(tableId)) continue;   // pas encore démarré
      for (const [seat, robotId] of subs) {
        try { await liveGameService.setSubstituteBrainForSeat(tableId, seat, robotId); }
        catch (e) { log.warn('config remplaçant échoué', { tableId, seat, error: (e as Error).message }); }
      }
      this.#substituteConfig.delete(tableId);   // configuré, on nettoie
      log.info('remplaçants attachés', { tableId, count: subs.size });
    }
  }

  /**
   * À la fin d'une session live sur une table match, cette méthode récupère
   * le résultat (score, gagnant, gameId) et le reporte sur le Match, puis
   * fait le versement (buy-in perdu / gagnant crédité) et le rake maison.
   * Appelée par le hook branché sur `liveGameService.finishedInfo`.
   */
  async settle(server: Server, tableId: string, matchId: string): Promise<void> {
    const info = await liveGameService.finishedInfo(tableId);
    if (!info) return;                 // pas encore fini
    const match = await MatchModel.findById(matchId);
    if (!match) return;
    if (match.status === MatchStatus.FINISHED) return;   // déjà réglé

    // Récupère les scores depuis la Game archivée (le liveGame l'a persistée).
    const { GameModel } = await import('../game/game.model.js');
    const game = await GameModel.findById(info.gameId).lean();
    const finalManche = (game as any)?.replay?.manches?.slice(-1)[0];
    const scoreA = finalManche?.cumulative?.A ?? 0;
    const scoreB = finalManche?.cumulative?.B ?? 0;

    match.status = MatchStatus.FINISHED;
    match.finishedAt = new Date();
    match.game = new Types.ObjectId(info.gameId);
    match.winnerTeam = info.winner as any;
    match.scoreTeamA = scoreA;
    match.scoreTeamB = scoreB;
    await match.save();

    // Économie : versement au(x) vainqueur(s), rake maison. Pour ROYAL_SQUARE,
    // il y a 2 vainqueurs (les 2 humains de l'équipe gagnante) → on crédite
    // chacun de rules.prizePerWinner. Pour HYBRID, un seul humain gagne
    // (son robot coéquipier joue avec, on ne crédite que l'humain).
    const format = match.format as MatchFormat;
    const rules = getMatchFormatRules(format);
    if (info.winner) {
      const winners = match.participants.filter((p: any) => p.team === info.winner && p.isHuman);
      for (const p of winners) {
        try {
          await walletService.credit(String(p.userId), rules.prizePerWinner, info.gameId, 'game_win');
        } catch (e) {
          log.warn('crédit vainqueur échoué', { userId: p.userId, error: (e as Error).message });
        }
      }
    }
    try {
      await houseAccountingService.recordMatchRake(match._id, rules.houseRake, format);
    } catch (e) {
      log.warn('rake maison échoué', { matchId, error: (e as Error).message });
    }

    // Libération du cache local.
    this.#tableByMatch.delete(matchId);
    log.info('match temps-réel réglé', { matchId, tableId, winner: info.winner });
  }

  /**
   * Sweep périodique : cherche les tables live des matchs qui sont
   * potentiellement terminées et fait le settle. Utilisé par le worker
   * tournois pour progresser sans polling agressif.
   */
  async sweepFinishedMatches(server: Server): Promise<void> {
    // Snapshot des matches en RUNNING non-headless.
    const running = await MatchModel.find({
      status: MatchStatus.RUNNING,
      format: { $in: [MatchFormat.HYBRID_ALLIANCE, MatchFormat.ROYAL_SQUARE] },
    }).select('_id liveTableId').lean();
    for (const m of running) {
      const tableId = (m as any).liveTableId ? String((m as any).liveTableId) : null;
      if (!tableId) continue;
      try { await this.settle(server, tableId, String((m as any)._id)); }
      catch { /* résilience */ }
    }
  }
}

export const matchLiveService = new MatchLiveService();
