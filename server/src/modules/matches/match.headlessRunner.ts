/* =============================================================================
 * MATCHES · match.headlessRunner.ts — Exécution back-end sans délai.
 * -----------------------------------------------------------------------------
 * Utilisé pour le format DUO_STEEL (2 robots vs 2 robots) : la partie tourne
 * en un seul appel synchrone, sans broadcast temps réel. Le replay archivé
 * permet de la rejouer avec les vraies vitesses côté client.
 *
 * Réutilise gamePersistenceService (pipeline standard : agrégat + replay +
 * projection wallet) pour rester CONFORME au reste de l'app. Un match terminé
 * s'affiche dans l'historique, le replay fonctionne, la comptabilité est
 * cohérente.
 * ========================================================================== */
import {
  ContreeRules, GameEngine, createAlgorithm, robotFromFiche, robotAct, shouldSurcontrer,
  resolveTableConfig,
  type EnginePlayer, type LogEntry, type RobotAlgorithm, type RobotConfig, type Seat,
} from 'belote-core';
import { Types } from 'mongoose';
import { RobotModel } from '../robot/robot.model.js';
import { gamePersistenceService, type PersistenceParticipant } from '../game/gamePersistence.service.js';
import { MatchModel, MatchStatus } from './match.model.js';
import { walletService } from '../wallet/wallet.service.js';
import { houseAccountingService } from '../houseAccounting/houseAccounting.service.js';
import { getMatchFormatRules, MatchFormat } from './matchFormat.js';

const MAX_STEPS = 20_000;

export interface HeadlessMatchResult {
  gameId: string;
  winnerTeam: 'A' | 'B' | null;
  scoreTeamA: number;
  scoreTeamB: number;
}

export class MatchHeadlessRunner {
  /** Lance et termine un match (DUO_STEEL) en synchronous. Rend le résultat. */
  async run(
    matchId: string,
    options: {
      manches: 1 | 2 | 4; baseTarget?: number; labelTarget?: number;
      // v17 — règles de belote configurables.
      openingBidMin?: number; countBelote?: boolean; clockwise?: boolean;
      prizePerWinner?: number; houseRake?: number;
    } = { manches: 2 },
  ): Promise<HeadlessMatchResult> {
    const match = await MatchModel.findById(matchId);
    if (!match) throw new Error(`Match introuvable : ${matchId}`);
    if (match.format !== MatchFormat.DUO_STEEL) throw new Error('Le runner headless ne gère que DUO_STEEL.');
    if (match.status === MatchStatus.FINISHED) throw new Error('Match déjà terminé.');

    match.status = MatchStatus.RUNNING;
    match.startedAt = new Date();
    await match.save();

    // Charger les fiches robots.
    const robotIds = match.participants.map((p: any) => String(p.robotId));
    const robotDocuments = await RobotModel.find({ _id: { $in: robotIds } }).lean();
    const robotById = new Map(robotDocuments.map((d: any) => [String(d._id), d]));

    const enginePlayers: EnginePlayer[] = match.participants
      .sort((a: any, b: any) => a.seat - b.seat)
      .map((p: any) => {
        const doc: any = robotById.get(String(p.robotId));
        return { seat: p.seat as Seat, name: doc?.name ?? `Robot ${p.seat + 1}`, type: 'robot', robotId: String(p.robotId) };
      });

    // v17 — barème + orchestration résolus depuis les options du match/tournoi
    // (score cible, score initial des enchères, belote comptée, sens du jeu).
    const { rulesConfig, partieConfig } = resolveTableConfig({
      manches: options.manches,
      baseTarget: options.baseTarget,
      labelTarget: options.labelTarget,
      openingBidMin: options.openingBidMin,
      countBelote: options.countBelote,
      clockwise: options.clockwise,
      responseTimeMs: 0,
      maxPlayTimeMs: 0,
      local: false,
    });
    const contreeRules = new ContreeRules(rulesConfig);
    const engine = new GameEngine(enginePlayers, partieConfig, contreeRules);
    const logs: LogEntry[] = [];
    const robots: RobotConfig[] = enginePlayers.map((p) =>
      robotFromFiche(robotById.get(p.robotId!) ?? {}, { id: p.robotId!, name: p.name }),
    );
    const brains: RobotAlgorithm[] = robots.map((robot) =>
      createAlgorithm(robot, contreeRules, (entry) => { if (logs.length < 800) logs.push(entry); }),
    );

    // Boucle synchrone, aucun délai.
    let steps = 0;
    while (engine.phase !== 'partie_end' && steps++ < MAX_STEPS) {
      if (engine.view().awaitingCollect) { engine.collectTrick(); continue; }
      if (engine.phase === 'donne_end') { engine.nextDonne(); continue; }
      if (engine.phase === 'manche_end') { engine.nextManche(); continue; }
      if (engine.phase === 'surcontre') {
        for (const s of engine.view().surcontreSeats as Seat[]) {
          engine.submitBid(s, { action: shouldSurcontrer(robots[s], engine.view(), s) ? 'surcontree' : 'pass' });
        }
        continue;
      }
      const seat = engine.turn!;
      const action = robotAct(engine, seat, brains[seat]);
      if (action.kind === 'bid') {
        if (!engine.submitBid(seat, action.bid).ok) engine.submitBid(seat, { action: 'pass' });
      } else {
        engine.playCard(seat, action.card);
      }
    }

    // Persistance via le pipeline standard.
    const persistParticipants: PersistenceParticipant[] = enginePlayers.map((p) => ({
      seat: p.seat, type: 'robot', robotId: p.robotId!,
    }));
    const ownerAId = String(match.participants.find((p: any) => p.team === 'A')!.userId);
    const { gameId, winner } = await gamePersistenceService.persistFinishedGame({
      engine, tableId: null, sessionId: null, ownerId: ownerAId, teamId: null,
      visibility: 'public', mode: 'competition', participants: persistParticipants, logs, substituteSeats: new Set(),
      // v18 — rattachement compétition (variante + tournoi éventuel).
      match: String(match._id),
      formatConfig: (match as any).formatConfig ? String((match as any).formatConfig) : null,
      tournament: (match as any).tournament ? String((match as any).tournament) : null,
    });

    const finalManche = engine.manches[engine.manches.length - 1];
    const winnerTeam = winner as 'A' | 'B' | null;

    // Mise à jour du Match.
    match.status = MatchStatus.FINISHED;
    match.finishedAt = new Date();
    match.game = new Types.ObjectId(gameId);
    match.winnerTeam = winnerTeam;
    match.scoreTeamA = finalManche.cumulative.A;
    match.scoreTeamB = finalManche.cumulative.B;
    await match.save();

    // Économie : verser le prix au vainqueur (propriétaire de l'équipe A ou B),
    // enregistrer le rake maison.
    const rules = getMatchFormatRules(MatchFormat.DUO_STEEL);
    // v16 — mise/gain configurables (quick match). Défaut = catalogue.
    const prizePerWinner = options.prizePerWinner ?? rules.prizePerWinner;
    const houseRake = options.houseRake ?? rules.houseRake;
    if (winnerTeam) {
      const winnerUserId = String(match.participants.find((p: any) => p.team === winnerTeam)!.userId);
      await walletService.credit(winnerUserId, prizePerWinner, gameId, 'game_win');
    }
    await houseAccountingService.recordMatchRake(match._id, houseRake, 'DUO_STEEL');

    // v14.12 — Si ce match Duo d'Acier fait partie d'un tournoi, update bracket.
    if ((match as any).tournament && winnerTeam) {
      try {
        const { tournamentService } = await import('../tournaments/tournament.service.js');
        const winnerParticipant = match.participants.find((p: any) => p.team === winnerTeam);
        if (winnerParticipant) {
          await tournamentService.recordMatchResult({
            tournamentId: String((match as any).tournament),
            matchId: String(match._id),
            winnerUserId: String(winnerParticipant.userId),
            scoreA: finalManche.cumulative.A,
            scoreB: finalManche.cumulative.B,
            // v17 — manches gagnées (best-of-N), score de progression.
            manchesA: engine.view().manchesWon.A,
            manchesB: engine.view().manchesWon.B,
            gameId,
          });
        }
      } catch (e) { /* silencieux : le résultat existe déjà, le tournoi rattrapera */ }
    }

    return { gameId, winnerTeam, scoreTeamA: finalManche.cumulative.A, scoreTeamB: finalManche.cumulative.B };
  }
}

export const matchHeadlessRunner = new MatchHeadlessRunner();
