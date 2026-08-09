/* =============================================================================
 * TOURNAMENTS · tournament.orchestrator.ts — Progression du bracket.
 * -----------------------------------------------------------------------------
 * Fait avancer un tournoi LIVE round par round jusqu'à la fin. Chaque round :
 *   1. Détermine les survivants (participants non éliminés).
 *   2. Les apparie 2 par 2 (DUO/HYBRID) ou 4 par 4 (ROYAL).
 *   3. Crée un Match par appariement, le lance (headless pour DUO_STEEL,
 *      temps-réel pour les autres).
 *   4. À la fin d'un match : marque les perdants comme éliminés à ce round,
 *      crédite le gain du round aux survivants (rounds[round].prize).
 *   5. Passe au round suivant ou marque le tournoi FINISHED.
 *
 * Séparé du service pour garder tournament.service focalisé sur l'inscription.
 * L'orchestrateur consomme le service pour la finalisation.
 * ========================================================================== */
import { Types } from 'mongoose';
import { TournamentModel, TournamentStatus } from './tournament.model.js';
import { tournamentService } from './tournament.service.js';
import { MatchModel, MatchStatus } from '../matches/match.model.js';
import { MatchFormat, getMatchFormatRules } from '../matches/matchFormat.js';
import { matchHeadlessRunner } from '../matches/match.headlessRunner.js';
import { walletService } from '../wallet/wallet.service.js';
import { houseAccountingService } from '../houseAccounting/houseAccounting.service.js';
import { pairForRound, survivorsAtStartOfRound, roundCount, type BracketSlot } from './bracket.js';

const PLAYERS_PER_MATCH: Record<MatchFormat, 2 | 4> = {
  [MatchFormat.DUO_STEEL]: 2,
  [MatchFormat.HYBRID_ALLIANCE]: 2,
  [MatchFormat.ROYAL_SQUARE]: 4,
};

export class TournamentOrchestrator {
  /**
   * Fait tourner un tournoi LIVE jusqu'à sa fin. Idempotent : peut être
   * rappelé si un round a été interrompu — reprend là où il s'est arrêté.
   */
  async run(tournamentId: string): Promise<{ finished: boolean }> {
    const t = await TournamentModel.findById(tournamentId);
    if (!t) throw new Error(`Tournoi introuvable : ${tournamentId}`);
    if (t.status !== TournamentStatus.LIVE) return { finished: t.status === TournamentStatus.FINISHED };

    const format = t.format as MatchFormat;
    const playersPerMatch = PLAYERS_PER_MATCH[format];
    const totalRounds = roundCount(t.capacity);

    // Reconstruction de l'état bracket depuis les participants + matchs déjà joués.
    const slots: BracketSlot[] = t.participants.map((p: any) => ({
      seedIndex: p.seedIndex ?? 0,
      userId: String(p.userId),
      robotIds: (p.robotIds || []).map((r: any) => String(r)),
      eliminatedAtRound: p.eliminatedAtRound ?? null,
    })).sort((a: BracketSlot, b: BracketSlot) => a.seedIndex - b.seedIndex);

    // Trouver le prochain round à jouer.
    let round = 1;
    while (round <= totalRounds) {
      const survivors = survivorsAtStartOfRound(slots, round);
      if (survivors.length < playersPerMatch) break;

      const pairs = pairForRound(survivors, playersPerMatch);
      if (pairs.length === 0) break;

      // Créer un Match par paire s'il n'existe pas déjà à ce round.
      const existing = await MatchModel.find({ tournament: t._id, tournamentRound: round }).lean();
      const existingCount = existing.length;

      if (existingCount < pairs.length) {
        // Créer les matchs manquants.
        for (let i = existingCount; i < pairs.length; i++) {
          const group = pairs[i];
          const participants = this.#buildParticipants(format, group);
          await MatchModel.create({
            format,
            status: MatchStatus.PAIRING,
            participants,
            tournament: t._id,
            tournamentRound: round,
            queuedAt: new Date(),
          });
        }
      }

      // Lancer tous les matchs pending de ce round.
      const roundMatches = await MatchModel.find({ tournament: t._id, tournamentRound: round });
      for (const m of roundMatches) {
        if (m.status === MatchStatus.PAIRING || m.status === MatchStatus.RUNNING) {
          if (format === MatchFormat.DUO_STEEL) {
            // Headless : joue en synchrone.
            try { await matchHeadlessRunner.run(String(m._id), { manches: 2 }); }
            catch { /* déjà terminé possiblement */ }
          } else {
            // Temps-réel : on marque RUNNING, le socket runner prendra la suite.
            // Pour v14.1 back-only, on simule une résolution rapide : les
            // matchs HYBRID/ROYAL restent RUNNING jusqu'à ce que le socket
            // les termine (v14.2). En attendant l'orchestrateur ne peut que
            // les enregistrer — la progression du round attendra.
            if (m.status === MatchStatus.PAIRING) {
              m.status = MatchStatus.RUNNING;
              m.startedAt = new Date();
              await m.save();
            }
          }
        }
      }

      // Recharger les matchs pour vérifier leur statut final.
      const finishedMatches = await MatchModel.find({
        tournament: t._id, tournamentRound: round, status: MatchStatus.FINISHED,
      });

      if (finishedMatches.length < pairs.length) {
        // Certains matchs ne sont pas encore terminés (formats temps-réel) :
        // on stoppe la progression, l'orchestrateur sera rappelé plus tard.
        return { finished: false };
      }

      // Marquer les perdants comme éliminés et distribuer les gains.
      const roundPrize = t.rounds.find((r: any) => r.round === round)?.prize ?? 0;
      for (const m of finishedMatches) {
        const winnerTeam = m.winnerTeam as 'A' | 'B' | null;
        for (const p of m.participants as any[]) {
          const userId = String(p.userId);
          const slot = slots.find((s) => s.userId === userId);
          if (!slot) continue;
          if (winnerTeam && p.team !== winnerTeam) {
            slot.eliminatedAtRound = round;
          } else if (winnerTeam && p.team === winnerTeam && roundPrize > 0) {
            // Crédite le gain de round (une seule fois par joueur — dédupliqué
            // par seat 0 uniquement pour éviter double crédit sur match d'équipe).
            if (p.seat === 0 || p.seat === 1) {
              await walletService.credit(userId, roundPrize, String(m._id), 'game_win');
              await houseAccountingService.recordTournamentPrize(t._id, userId, round, roundPrize);
            }
          }
        }
      }

      // Persiste l'état des participants (eliminatedAtRound).
      for (const slot of slots) {
        const p = t.participants.find((pp: any) => String(pp.userId) === slot.userId);
        if (p) p.eliminatedAtRound = slot.eliminatedAtRound;
      }
      t.bracket = t.bracket || [];
      t.bracket[round - 1] = finishedMatches.map((m: any) => m._id);
      await t.save();

      round++;
    }

    // Si un seul survivant reste → tournoi terminé.
    const alive = slots.filter((s) => s.eliminatedAtRound === null);
    if (alive.length <= (playersPerMatch === 4 ? 2 : 1)) {
      await tournamentService.markFinished(String(t._id), alive.map((s) => s.userId));
      return { finished: true };
    }
    return { finished: false };
  }

  /** Distribue les slots gagnants sur les 4 sièges d'un Match. */
  #buildParticipants(format: MatchFormat, group: BracketSlot[]) {
    const asId = (id: string) => new Types.ObjectId(id);
    const rules = getMatchFormatRules(format);
    const p: Array<{ seat: number; userId: Types.ObjectId | null; robotId: Types.ObjectId | null; team: 'A' | 'B'; isHuman: boolean }> = [];

    if (format === MatchFormat.DUO_STEEL) {
      // group[0] → A (sièges 0,2), group[1] → B (sièges 1,3)
      p.push({ seat: 0, userId: asId(group[0].userId), robotId: asId(group[0].robotIds[0]), team: 'A', isHuman: false });
      p.push({ seat: 2, userId: asId(group[0].userId), robotId: asId(group[0].robotIds[1]), team: 'A', isHuman: false });
      p.push({ seat: 1, userId: asId(group[1].userId), robotId: asId(group[1].robotIds[0]), team: 'B', isHuman: false });
      p.push({ seat: 3, userId: asId(group[1].userId), robotId: asId(group[1].robotIds[1]), team: 'B', isHuman: false });
    } else if (format === MatchFormat.HYBRID_ALLIANCE) {
      p.push({ seat: 0, userId: asId(group[0].userId), robotId: null, team: 'A', isHuman: true });
      p.push({ seat: 2, userId: asId(group[0].userId), robotId: asId(group[0].robotIds[0]), team: 'A', isHuman: false });
      p.push({ seat: 1, userId: asId(group[1].userId), robotId: null, team: 'B', isHuman: true });
      p.push({ seat: 3, userId: asId(group[1].userId), robotId: asId(group[1].robotIds[0]), team: 'B', isHuman: false });
    } else {
      p.push({ seat: 0, userId: asId(group[0].userId), robotId: null, team: 'A', isHuman: true });
      p.push({ seat: 1, userId: asId(group[1].userId), robotId: null, team: 'B', isHuman: true });
      p.push({ seat: 2, userId: asId(group[2].userId), robotId: null, team: 'A', isHuman: true });
      p.push({ seat: 3, userId: asId(group[3].userId), robotId: null, team: 'B', isHuman: true });
    }
    return p;
  }
}

export const tournamentOrchestrator = new TournamentOrchestrator();
