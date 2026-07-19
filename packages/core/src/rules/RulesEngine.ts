// ============================================================================
//  RulesEngine — POINT UNIQUE d'abstraction des règles
//  C'est ICI qu'un développeur branche une variante (Contrée, Coinche,
//  Annonce...). Tout le reste du moteur ne dépend QUE de cette interface,
//  jamais d'une implémentation concrète.
// ============================================================================

import type { Card, Suit } from '../domain/cards';
import type { Seat } from '../domain/types';

export interface TrickEntry {
  seat: Seat;
  card: Card;
}

export interface MancheScoreInput {
  takerTeam: 'A' | 'B';
  contract: number; // 90..180, ou capot
  isCapot: boolean;
  capotDeclared: boolean;
  trump: Suit;
  contre: 'none' | 'contree' | 'surcontree';
  /** Points de cartes bruts par équipe (avant arrondi, hors belote / dix de der). */
  rawPoints: { A: number; B: number };
  /** Équipe ayant remporté le dernier pli (dix de der). */
  lastTrickTeam: 'A' | 'B';
  /** Équipe détenant Roi+Dame d'atout, si annoncée. */
  beloteTeam: 'A' | 'B' | null;
}

export interface MancheScoreResult {
  A: number;
  B: number;
  contractMet: boolean;
  detail: Record<string, unknown>;
}

/**
 * Contrat que doit respecter toute variante de règles.
 * Les règles de pose de carte (suivre, couper, monter) ET le calcul de manche
 * vivent ici — un seul endroit à modifier.
 */
export interface RulesEngine {
  readonly name: string;
  readonly minBid: number;
  readonly maxBid: number;

  /** Index du gagnant du pli dans le tableau `trick`. */
  trickWinnerIndex(trick: TrickEntry[], trump: Suit): number;

  /**
   * Cartes jouables légalement (suivre / couper / monter / pisser).
   * Même implémentation appelée côté front (pré-validation) ET côté back
   * (validation autoritaire).
   */
  legalMoves(params: {
    hand: Card[];
    trick: TrickEntry[];
    trump: Suit;
    mySeat: Seat;
    partnerSeat: Seat;
  }): Card[];

  isLegalMove(params: {
    card: Card;
    hand: Card[];
    trick: TrickEntry[];
    trump: Suit;
    mySeat: Seat;
    partnerSeat: Seat;
  }): boolean;

  /** Arrondi des points de cartes (>=5 vers le haut). */
  roundPoints(raw: number): number;

  /** Calcul des points de la manche (variante-spécifique, donc ici). */
  scoreManche(input: MancheScoreInput): MancheScoreResult;
}

export const partnerOf = (seat: Seat): Seat => ((seat + 2) % 4) as Seat;
export const teamOf = (seat: Seat): 'A' | 'B' => (seat % 2 === 0 ? 'A' : 'B');
