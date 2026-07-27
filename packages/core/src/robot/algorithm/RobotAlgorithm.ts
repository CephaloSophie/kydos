// ============================================================================
//  RobotAlgorithm — CONTRAT ABSTRAIT du cerveau d'un robot.
//
//  Chaque robot pointe vers une AlgoSpec (JSON) ; le cœur résout cette spec en
//  un RobotAlgorithm concret. L'algorithme ne voit que le RobotContext (lecture
//  seule) et répond aux 4 décisions du jeu. Aucun accès au moteur, au réseau ni
//  à l'état mutable : pure fonction (contexte) -> décision.
// ============================================================================

import type { Card } from '../../domain/cards';
import type { BidDecision, CardDecision, Personality, Seat, TableContext } from '../../domain/types';
import type { AlgoSpec } from '../AlgoSpec';

/** Tout ce qu'un robot « voit » pour décider — strictement en lecture seule. */
export interface RobotContext {
  seat: Seat;
  partnerSeat: Seat;
  myTeam: 'A' | 'B';
  personality: Personality;
  spec: AlgoSpec;

  /** Ma main. */
  hand: Card[];

  /** Contexte de table partagé (atout, enchères, plis, atouts vus/restants…). */
  table: TableContext;

  /** Suis-je (ou mon équipe) le demandeur ? */
  isDemandeur: boolean;
  partnerIsDemandeur: boolean;

  /** Coups autorisés à cet instant (déjà filtrés par les règles). */
  legalCards: Card[];

  /** Bornes/possibilités d'enchère à cet instant. */
  legalBidInfo: {
    minValue: number;
    maxValue: number;
    canContre: boolean;
    canSurcontre: boolean;
  };

  /** Nombre d'atouts joués / restants / non vus (raccourcis de table). */
  trumpsPlayed: number;
  trumpsRemaining: number;
  trumpsUnseen: Card[];
}

/**
 * Contrat que TOUT algorithme de robot doit implémenter.
 * (« quelle carte jouer », « quoi annoncer », « contrer ? », « surcontrer ? »).
 */
export interface RobotAlgorithm {
  readonly id: string;
  readonly name: string;
  /** La spec JSON dont l'algorithme est issu (lecture seule). */
  readonly spec: AlgoSpec;
  /** Temps de réflexion de base (ms) du robot porteur. */
  readonly responseTimeMs: number;
  readonly maxPlayTimeMs: number;

  decideBid(ctx: RobotContext): BidDecision;
  decideCard(ctx: RobotContext): CardDecision;
  shouldContre(ctx: RobotContext): boolean;
  shouldSurcontre(ctx: RobotContext): boolean;
}
