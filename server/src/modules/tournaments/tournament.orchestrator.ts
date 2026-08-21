/* =============================================================================
 * TOURNAMENTS · tournament.orchestrator.ts — Progression du bracket (v14.12).
 * -----------------------------------------------------------------------------
 * Nouvelle architecture v14.12 : l'orchestrateur ne gère plus lui-même la
 * distribution des gains ni la fin du tournoi (délégué à
 * `tournamentService.recordMatchResult()`, appelé automatiquement à chaque
 * fin de match via les runners). Son rôle est réduit à :
 *
 *   1. Lire le `bracketTree` persistant.
 *   2. Trouver les BracketMatch prêts à jouer (slotA + slotB alimentés,
 *      pas encore de matchId).
 *   3. Créer le Match Mongo correspondant.
 *   4. Lancer immédiatement le matchHeadlessRunner pour DUO_STEEL.
 *      Pour HYBRID_ALLIANCE et ROYAL_SQUARE, provisionner une table live
 *      via matchLiveService (les joueurs recevront une notif « Rejoindre »).
 *   5. Persister l'arbre mis à jour (matchId + startedAt).
 *
 * La suite (avancement des slots, éliminés, gains, fin du tournoi) est prise
 * en charge automatiquement par `recordMatchResult()` déclenché par le hook
 * fin-de-match des runners.
 *
 * IDEMPOTENT : peut être rappelé par le worker, ne relance pas les matchs
 * déjà créés/terminés. Chaque BracketMatch a une progression claire :
 *   matchId=null           → à créer et à lancer
 *   matchId, winner=null   → en cours ou en attente de joueurs (skip)
 *   matchId, winner=A|B    → terminé (skip, déjà géré par recordMatchResult)
 *
 * Simplification volontaire v14.12 : ROYAL_SQUARE (4 humains) n'est pas
 * supporté dans les tournois bracket pour le moment. La création d'un
 * tournoi ROYAL_SQUARE est rejetée en amont (voir tournamentService.create).
 * ========================================================================== */
import { Types } from 'mongoose';
import { TournamentModel, TournamentStatus } from './tournament.model.js';
import { MatchModel, MatchStatus } from '../matches/match.model.js';
import { MatchFormat, getMatchFormatRules } from '../matches/matchFormat.js';
import { matchHeadlessRunner } from '../matches/match.headlessRunner.js';
import { matchLiveService } from '../matches/match.liveRunner.js';

export class TournamentOrchestrator {
  /**
   * Fait progresser un tournoi LIVE : crée et lance les matchs du round
   * courant. Idempotent — sans effet si tous les matchs du round sont déjà
   * créés/en cours. À rappeler périodiquement par le worker.
   */
  async run(tournamentId: string): Promise<{ finished: boolean; roundsScheduled: number; matchesLaunched: number }> {
    const t: any = await TournamentModel.findById(tournamentId);
    if (!t) throw new Error(`Tournoi introuvable : ${tournamentId}`);
    if (t.status === TournamentStatus.FINISHED) return { finished: true, roundsScheduled: 0, matchesLaunched: 0 };
    if (t.status !== TournamentStatus.LIVE) return { finished: false, roundsScheduled: 0, matchesLaunched: 0 };

    const format = t.format as MatchFormat;
    const rules = getMatchFormatRules(format);
    // v16 — réglages de jeu du tournoi appliqués à chaque match (manches, score
    // cible, timeouts…). Défaut si absent (tournois créés avant v16).
    const gameConfig = (t.gameConfig ?? {}) as Record<string, any>;
    const tree = t.bracketTree;
    if (!tree || !tree.rounds || tree.rounds.length === 0) {
      return { finished: false, roundsScheduled: 0, matchesLaunched: 0 };
    }

    // Round courant = premier round non entièrement fini.
    const currentRoundIndex = (tree.lastCompletedRound ?? 0) + 1;
    const round = tree.rounds.find((r: any) => r.roundIndex === currentRoundIndex);
    if (!round) return { finished: false, roundsScheduled: 0, matchesLaunched: 0 };

    // Index participants par userId pour retrouver robotIds / substituteRobotId.
    const participantsByUser = new Map<string, any>();
    for (const p of t.participants) {
      participantsByUser.set(String(p.userId?._id ?? p.userId), p);
    }

    // v16 — compte à rebours (s) avant chaque match. Le match n'est CRÉÉ
    // qu'une fois l'instant planifié atteint, laissant au joueur le temps
    // d'être notifié et de rejoindre. 0 = démarrage immédiat.
    const countdownMs = Math.max(0, Number(gameConfig.roundCountdownSec ?? 10)) * 1000;

    let matchesLaunched = 0;
    let dirty = false;

    for (const bm of round.matches) {
      // Slot pas encore alimenté : gagnants du round précédent pas encore
      // déterminés → on ne peut pas lancer ce match, on attend.
      if (!bm.slotA?.userId || !bm.slotB?.userId) continue;
      // Déjà créé et en cours ou fini → skip.
      if (bm.matchId) continue;

      // Compte à rebours : à la 1ʳᵉ fois où les 2 slots sont connus, on planifie
      // le démarrage ; on ne crée le match qu'une fois l'instant atteint.
      if (countdownMs > 0) {
        if (!bm.scheduledStartAt) {
          bm.scheduledStartAt = new Date(Date.now() + countdownMs);
          dirty = true;
          continue;
        }
        if (new Date(bm.scheduledStartAt).getTime() > Date.now()) continue;   // décompte en cours
      }

      const participants = this.#buildParticipants(format, bm, participantsByUser);
      if (!participants) continue;   // config incomplète (ne devrait pas arriver)

      const created: any = await MatchModel.create({
        format,
        status: MatchStatus.PAIRING,
        participants,
        tournament: t._id,
        tournamentRound: currentRoundIndex,
        queuedAt: new Date(),
      });
      bm.matchId = created._id;
      bm.startedAt = new Date();
      dirty = true;
      matchesLaunched++;

      // Lancer le match selon son format.
      if (format === MatchFormat.DUO_STEEL) {
        // Headless : joue immédiatement en background. Le hook
        // recordMatchResult sera appelé en fin de match. v16 — réglages tournoi.
        const manches = [1, 2, 4].includes(gameConfig.manches) ? gameConfig.manches : 2;
        void matchHeadlessRunner.run(String(created._id), {
          manches, baseTarget: gameConfig.baseTarget, labelTarget: gameConfig.labelTarget,
          // v17 — règles de belote configurables du tournoi.
          openingBidMin: gameConfig.openingBidMin, countBelote: gameConfig.countBelote, clockwise: gameConfig.clockwise,
          // v19 — coefficient de score du tournoi.
          scoreCoefficient: gameConfig.scoreCoefficient,
        }).catch(() => {});
      } else if (format === MatchFormat.HYBRID_ALLIANCE || format === MatchFormat.ROYAL_SQUARE) {
        // v14.14 — HYBRID (2 humains) et ROYAL (4 humains) : table live que
        // les humains rejoindront. Provisionne la table PUIS passe le match en
        // RUNNING (comme le matchmaking, matchmaking.service.ts).
        //
        // CRITIQUE : sans le passage en RUNNING, `sweepFinishedMatches` — qui ne
        // balaie QUE les matchs RUNNING — ne réglerait jamais ce match. Le
        // bracket ne progresserait donc pas (pas de round suivant, scores et
        // arbre figés, perdants jamais éliminés). Le `updateOne` atomique ne
        // touche que status/startedAt et n'écrase pas le liveTableId posé par
        // provision().
        try {
          // v18 — normalise tableThemeId en chaîne (comme le matchmaking), pour
          // que le thème (feutre + dos des cartes) s'applique aux tables de
          // tournoi exactement comme aux matchs rapides.
          await matchLiveService.provision(String(created._id), {
            ...gameConfig,
            tableThemeId: gameConfig.tableThemeId ? String(gameConfig.tableThemeId) : null,
          });
        } catch { /* si provision échoue, la table sera créée à la demande */ }
        await MatchModel.updateOne(
          { _id: created._id },
          { $set: { status: MatchStatus.RUNNING, startedAt: new Date() } },
        );
      }
    }

    if (dirty) await t.save();

    // Le tournoi est-il fini ? recordMatchResult finalise déjà via status
    // = FINISHED — on relit juste.
    const fresh: any = await TournamentModel.findById(tournamentId).select('status').lean();
    return {
      finished: fresh?.status === TournamentStatus.FINISHED,
      roundsScheduled: 1,
      matchesLaunched,
    };
  }

  /**
   * Construit les 4 participants d'un Match à partir d'un BracketMatch.
   * Retrouve les robots depuis le tournoi.participants (dénormalisé sur le
   * bracket, on ne stocke que userId + displayName pour l'affichage).
   *
   * Layout des sièges :
   *   • DUO_STEEL : slotA = équipe A (sièges 0/2, 2 robots du joueur),
   *                 slotB = équipe B (sièges 1/3).
   *   • HYBRID_ALLIANCE : slotA = humain siège 0 + son 1er coéquipier
   *                       robot siège 2, slotB = même chose pour l'équipe B.
   */
  #buildParticipants(format: MatchFormat, bm: any, participantsByUser: Map<string, any>): any[] | null {
    const asId = (id: string) => new Types.ObjectId(id);
    const pA = participantsByUser.get(String(bm.slotA.userId));
    const pB = participantsByUser.get(String(bm.slotB.userId));
    if (!pA || !pB) return null;

    const robotsA = (pA.robotIds || []).map((r: any) => String(r));
    const robotsB = (pB.robotIds || []).map((r: any) => String(r));

    if (format === MatchFormat.DUO_STEEL) {
      // Exige 2 robots par joueur (validé à l'inscription).
      if (robotsA.length < 2 || robotsB.length < 2) return null;
      return [
        { seat: 0, userId: asId(String(pA.userId)), robotId: asId(robotsA[0]), team: 'A', isHuman: false },
        { seat: 2, userId: asId(String(pA.userId)), robotId: asId(robotsA[1]), team: 'A', isHuman: false },
        { seat: 1, userId: asId(String(pB.userId)), robotId: asId(robotsB[0]), team: 'B', isHuman: false },
        { seat: 3, userId: asId(String(pB.userId)), robotId: asId(robotsB[1]), team: 'B', isHuman: false },
      ];
    }
    if (format === MatchFormat.HYBRID_ALLIANCE) {
      // Humain siège 0/1, robot coéquipier siège 2/3.
      if (robotsA.length < 1 || robotsB.length < 1) return null;
      return [
        { seat: 0, userId: asId(String(pA.userId)), robotId: null, team: 'A', isHuman: true },
        { seat: 2, userId: asId(String(pA.userId)), robotId: asId(robotsA[0]), team: 'A', isHuman: false },
        { seat: 1, userId: asId(String(pB.userId)), robotId: null, team: 'B', isHuman: true },
        { seat: 3, userId: asId(String(pB.userId)), robotId: asId(robotsB[0]), team: 'B', isHuman: false },
      ];
    }
    if (format === MatchFormat.ROYAL_SQUARE) {
      // v14.14 — Chaque slot du bracket est une ÉQUIPE de 2 humains
      // (formée au démarrage). slotA = équipe A (sièges 0/2), slotB = équipe B
      // (sièges 1/3). Aucun robot coéquipier ; un robot REMPLAÇANT par humain
      // prend la main en cas d'absence (substituteRobotId, renseigné à l'inscription).
      const a1 = bm.slotA.userId ? String(bm.slotA.userId) : null;
      const a2 = bm.slotA.userId2 ? String(bm.slotA.userId2) : null;
      const b1 = bm.slotB.userId ? String(bm.slotB.userId) : null;
      const b2 = bm.slotB.userId2 ? String(bm.slotB.userId2) : null;
      if (!a1 || !a2 || !b1 || !b2) return null;
      const sub = (uid: string) => {
        const p = participantsByUser.get(uid);
        return p?.substituteRobotId ? asId(String(p.substituteRobotId)) : null;
      };
      return [
        { seat: 0, userId: asId(a1), robotId: null, substituteRobotId: sub(a1), team: 'A', isHuman: true },
        { seat: 2, userId: asId(a2), robotId: null, substituteRobotId: sub(a2), team: 'A', isHuman: true },
        { seat: 1, userId: asId(b1), robotId: null, substituteRobotId: sub(b1), team: 'B', isHuman: true },
        { seat: 3, userId: asId(b2), robotId: null, substituteRobotId: sub(b2), team: 'B', isHuman: true },
      ];
    }
    return null;
  }
}

export const tournamentOrchestrator = new TournamentOrchestrator();
