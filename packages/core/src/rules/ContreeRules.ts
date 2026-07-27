// ============================================================================
//  ContreeRules — implémentation « Contrée » de RulesEngine.
//  Pour ajouter une variante (Coinche, Annonce...) : créer un nouveau fichier
//  qui implémente RulesEngine. Rien d'autre dans le moteur ne change.
// ============================================================================

import { cardStrength, cardsOfSuit, type Card, type Suit } from '../domain/cards';
import type { Seat } from '../domain/types';
import { DEFAULT_RULES_CONFIG, type RulesConfig } from './RulesConfig';
import { roundPoints, scoreManche } from '../scoring/donneScoring';
import {
  partnerOf,
  teamOf,
  type MancheScoreInput,
  type MancheScoreResult,
  type RulesEngine,
  type TrickEntry,
} from './RulesEngine';

export class ContreeRules implements RulesEngine {
  readonly name = 'contree';
  readonly minBid: number;
  readonly maxBid: number;

  constructor(readonly config: RulesConfig = DEFAULT_RULES_CONFIG) {
    this.minBid = config.minBid;
    this.maxBid = config.maxBid;
  }

  trickWinnerIndex(trick: TrickEntry[], trump: Suit): number {
    if (trick.length === 0) return -1;
    const leadSuit = trick[0].card.suit;
    const trumps = trick.filter((t) => t.card.suit === trump);
    const pool = trumps.length > 0 ? trumps : trick.filter((t) => t.card.suit === leadSuit);
    let best = pool[0];
    for (const t of pool) {
      if (cardStrength(t.card, trump) > cardStrength(best.card, trump)) best = t;
    }
    return trick.indexOf(best);
  }

  legalMoves(params: {
    hand: Card[];
    trick: TrickEntry[];
    trump: Suit;
    mySeat: Seat;
    partnerSeat: Seat;
  }): Card[] {
    const { hand, trick, trump, partnerSeat } = params;
    if (trick.length === 0) return [...hand];

    const leadSuit = trick[0].card.suit;
    const followCards = cardsOfSuit(hand, leadSuit);
    const trumps = cardsOfSuit(hand, trump);
    const trumpsInTrick = trick.filter((t) => t.card.suit === trump);
    const highestTrumpStrength = trumpsInTrick.length
      ? Math.max(...trumpsInTrick.map((t) => cardStrength(t.card, trump)))
      : -1;

    // Cas 1 : on a entamé à l'atout -> obligation de fournir l'atout et de monter.
    if (leadSuit === trump) {
      if (followCards.length === 0) return [...hand]; // pas d'atout : libre
      const higher = followCards.filter((c) => cardStrength(c, trump) > highestTrumpStrength);
      return higher.length ? higher : followCards; // monter si possible, sinon n'importe quel atout
    }

    // Cas 2 : on peut fournir la couleur demandée.
    if (followCards.length > 0) return followCards;

    // Cas 3 : on ne peut pas fournir. Le partenaire est-il maître ?
    const winnerIdx = this.trickWinnerIndex(trick, trump);
    const partnerIsMaster = trick[winnerIdx]?.seat === partnerSeat;
    if (partnerIsMaster) return [...hand]; // pas d'obligation de couper

    // Cas 4 : adversaire maître -> obligation de couper si on a de l'atout.
    if (trumps.length === 0) return [...hand];
    if (trumpsInTrick.length > 0) {
      const higher = trumps.filter((c) => cardStrength(c, trump) > highestTrumpStrength);
      return higher.length ? higher : trumps; // surcouper si possible, sinon pisser
    }
    return trumps;
  }

  isLegalMove(params: {
    card: Card;
    hand: Card[];
    trick: TrickEntry[];
    trump: Suit;
    mySeat: Seat;
    partnerSeat: Seat;
  }): boolean {
    const legal = this.legalMoves(params);
    return legal.some((c) => c.suit === params.card.suit && c.rank === params.card.rank);
  }

  /** Arrondi à la dizaine, >=5 vers le haut. Délègue au module scoring (pur). */
  roundPoints(raw: number): number {
    return roundPoints(raw, this.config.roundTo);
  }

  /**
   * Score d'une manche : délègue au module scoring PUR et INDÉPENDANT (scoring/donneScoring).
   * Le barème reste piloté par this.config ; toute correction de règle se fait à un seul endroit.
   */
  scoreManche(input: MancheScoreInput): MancheScoreResult {
    return scoreManche(input, this.config);
  }
}

// Helpers réexportés pour confort.
export { partnerOf, teamOf };
