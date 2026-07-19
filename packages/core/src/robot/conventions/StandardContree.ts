// ============================================================================
//  StandardContreeConvention — implémentation FIDÈLE de la convention décrite.
//
//  Langage d'enchère (codage d'information vers le partenaire) :
//   - Ouverture forte (100, couleur) : Valet + 9 d'atout ET >= 4 cartes d'atout.
//   - Réponse partenaire = +10 / As (hors atout), +10 Valet d'atout,
//     +10 9 d'atout, + bonus de longueur (au-delà de 2 atouts).
//   - On NOMME la couleur si >= 2 atouts ; sinon « N tout court » (Valet seul).
//   - Sur ouverture FAIBLE (90) sans Valet d'atout : on passe et on GARDE les As
//     pour un tour ultérieur.
//   - Main riche (>= 3 atouts) -> le robot « réfléchit deux fois » (x2).
// ============================================================================

import { cardsOfSuit, handContains, SUITS, type Card, type Suit } from '../../domain/cards';
import type { BidDecision, TableContext } from '../../domain/types';
import type { RobotLogger } from '../logger';
import {
  DEFAULT_CONVENTION,
  type BiddingConvention,
  type BiddingMemory,
  type ConventionConfig,
} from './BiddingConvention';

const PHASE = 'enchere';

/** Contrée bids are ALWAYS multiples of 10: round down, but never below `min`. */
function legalBidValue(raw: number, min: number, max: number): number {
  const floored = Math.floor(raw / 10) * 10;
  return Math.min(Math.max(floored, min), max);
}

export class StandardContreeConvention implements BiddingConvention {
  readonly id = 'standard-contree';
  config: ConventionConfig;

  constructor(overrides: Partial<ConventionConfig> = {}) {
    this.config = { ...DEFAULT_CONVENTION, ...overrides };
  }

  // ---- analyses de main -----------------------------------------------------

  /** As hors atout (chaque As = signal). */
  private offTrumpAces(hand: Card[], trump: Suit): number {
    return hand.filter((c) => c.rank === 'A' && c.suit !== trump).length;
  }

  private hasValetTrump(hand: Card[], trump: Suit) {
    return handContains(hand, 'V', trump);
  }
  private hasNineTrump(hand: Card[], trump: Suit) {
    return handContains(hand, '9', trump);
  }
  private trumpCount(hand: Card[], trump: Suit) {
    return cardsOfSuit(hand, trump).length;
  }

  // ---- ouverture ------------------------------------------------------------

  evaluateOpening(args: {
    hand: Card[];
    ctx: TableContext;
    memory: BiddingMemory;
    log: RobotLogger;
  }): BidDecision {
    const { hand, log } = args;
    const c = this.config;

    log.info(PHASE, 'Analyse d\'ouverture : recherche d\'une couleur forte (V+9+>=4 atouts).');

    let best: { suit: Suit; trumps: number } | null = null;
    for (const suit of SUITS) {
      const n = this.trumpCount(hand, suit);
      const strong = this.hasValetTrump(hand, suit) && this.hasNineTrump(hand, suit)
        && n >= c.strongOpenMinTrump;
      log.trace(PHASE, `Couleur ${suit} : ${n} cartes, forte=${strong}`);
      if (strong && (!best || n > best.trumps)) best = { suit, trumps: n };
    }

    if (best) {
      log.info(PHASE, `Ouverture FORTE ${c.strongOpenValue} ${best.suit} (V+9 + ${best.trumps} atouts).`);
      return {
        action: 'bid',
        value: legalBidValue(c.strongOpenValue, 90, c.maxBid),
        suit: best.suit,
        saySuit: true,
        thinkMultiplier: best.trumps >= c.deepThinkTrumpThreshold ? 2 : 1,
        reason: `V+9+${best.trumps} atouts ${best.suit}`,
      };
    }

    // Ouverture FAIBLE (90) : meilleure couleur si longueur suffisante,
    // ou V/9 d'atout + longueur correcte.
    let weak: { suit: Suit; trumps: number } | null = null;
    for (const suit of SUITS) {
      const n = this.trumpCount(hand, suit);
      const hasKey = this.hasValetTrump(hand, suit) || this.hasNineTrump(hand, suit);
      const ok = n >= c.weakOpenMinTrump || (hasKey && n >= c.weakOpenKeyMinTrump);
      if (ok && (!weak || n > weak.trumps)) weak = { suit, trumps: n };
    }
    if (weak) {
      log.info(PHASE, `Ouverture FAIBLE ${c.weakOpenValue} ${weak.suit} (${weak.trumps} atouts).`);
      return {
        action: 'bid',
        value: legalBidValue(c.weakOpenValue, 90, c.maxBid),
        suit: weak.suit,
        saySuit: true,
        thinkMultiplier: 1,
        reason: `ouverture mini ${weak.trumps} atouts ${weak.suit}`,
      };
    }

    log.info(PHASE, 'Aucune couleur assez forte : je passe à l\'ouverture.');
    return { action: 'pass', thinkMultiplier: 1, reason: 'main insuffisante pour ouvrir' };
  }

  // ---- réponse au partenaire ------------------------------------------------

  evaluatePartnerResponse(args: {
    hand: Card[];
    ctx: TableContext;
    partnerBid: { value: number; suit: Suit; saidSuit: boolean };
    memory: BiddingMemory;
    log: RobotLogger;
  }): BidDecision {
    const { hand, partnerBid, memory, log } = args;
    const c = this.config;
    const trump = partnerBid.suit;

    const aces = this.offTrumpAces(hand, trump);
    const valet = this.hasValetTrump(hand, trump);
    const nine = this.hasNineTrump(hand, trump);
    const trumps = this.trumpCount(hand, trump);
    const isWeakOpen = partnerBid.value <= c.weakOpenValue;

    log.info(
      PHASE,
      `Réponse au partenaire (${partnerBid.value} ${trump}). As=${aces} Valet=${valet} 9=${nine} atouts=${trumps} ouvertureFaible=${isWeakOpen}`,
    );

    // Règle de RÉTENTION : ouverture faible (90) sans Valet d'atout -> on passe
    // et on garde les As pour les replacer plus tard.
    if (isWeakOpen && !valet && c.holdAcesOnWeakOpen) {
      memory.heldAces = aces;
      log.warn(PHASE, `Sans Valet d'atout sur ouverture 90 : je PASSE et je garde ${aces} As.`);
      return { action: 'pass', thinkMultiplier: 1, reason: `garde ${aces} As (pas de Valet d'atout)` };
    }

    // Accumulation du signal.
    let increment = 0;
    const parts: string[] = [];
    if (valet) { increment += c.valetTrumpPoints; parts.push(`Valet+${c.valetTrumpPoints}`); }
    if (nine) { increment += c.nineTrumpPoints; parts.push(`9+${c.nineTrumpPoints}`); }
    const acesToCount = aces + memory.heldAces;
    if (acesToCount > 0) {
      increment += acesToCount * c.acePoints;
      parts.push(`${acesToCount}As+${acesToCount * c.acePoints}`);
      memory.heldAces = 0;
    }
    const extra = Math.max(0, trumps - c.lengthBonusThreshold);
    if (extra > 0) {
      increment += extra * c.lengthBonusPerExtra;
      parts.push(`longueur+${extra * c.lengthBonusPerExtra}`);
    }

    if (increment === 0) {
      log.info(PHASE, 'Rien à signaler : je passe.');
      return { action: 'pass', thinkMultiplier: 1, reason: 'aucun signal' };
    }

    const value = legalBidValue(partnerBid.value + increment, partnerBid.value + 10, c.maxBid);
    const saySuit = trumps >= c.minTrumpToSaySuit;
    const deep = trumps >= c.deepThinkTrumpThreshold;

    log.info(
      PHASE,
      `Réponse : ${value}${saySuit ? ' ' + trump : ' (tout court)'} [${parts.join(' ')}]${deep ? ' — je réfléchis deux fois' : ''}`,
    );

    return {
      action: 'bid',
      value,
      suit: trump,
      saySuit,
      thinkMultiplier: deep ? 2 : 1,
      reason: parts.join(' '),
    };
  }
}
