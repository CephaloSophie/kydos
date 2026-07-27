// ============================================================================
//  BiddingConvention — INTERFACE + configuration paramétrable.
//  Chaque robot possède SA convention (par défaut la même, surchargeable carte
//  par carte). On ajoute / modifie une convention ou une « influence » sans
//  toucher au reste : on change la config, ou on étend l'interface.
// ============================================================================

import type { Card, Suit } from '../../domain/cards';
import type { BidDecision, TableContext } from '../../domain/types';
import type { RobotLogger } from '../logger';

/**
 * Tous les paramètres chiffrés des conventions sont ici, donc ajustables par
 * robot. Modifier une « convention » = changer ces nombres ou les prédicats.
 */
export interface ConventionConfig {
  /** Points de signal attribués à chaque atout / carte clé. */
  acePoints: number; // par As hors atout
  valetTrumpPoints: number; // Valet d'atout
  nineTrumpPoints: number; // 9 d'atout
  /** Bonus de longueur : (nbAtouts - seuil) * points. */
  lengthBonusThreshold: number;
  lengthBonusPerExtra: number;
  /** À partir de combien d'atouts on répète (annonce) la couleur. */
  minTrumpToSaySuit: number;
  /** Ouvertures. */
  weakOpenValue: number; // ouverture minimale (90)
  strongOpenValue: number; // ouverture « forte » (100)
  /** Une ouverture forte exige V+9 d'atout et >= ce nb de cartes d'atout. */
  strongOpenMinTrump: number;
  /** Ouverture faible (90) : nb min de cartes dans la couleur. */
  weakOpenMinTrump: number;
  /** Ouverture faible alternative : V ou 9 + ce nb min de cartes. */
  weakOpenKeyMinTrump: number;
  /** Sur ouverture faible (90) sans Valet d'atout : on passe et on garde les As. */
  holdAcesOnWeakOpen: boolean;
  /** Réflexion x2 lorsque la main est riche (>= ce nb d'atouts). */
  deepThinkTrumpThreshold: number;
  maxBid: number;
}

export const DEFAULT_CONVENTION: ConventionConfig = {
  acePoints: 10,
  valetTrumpPoints: 10,
  nineTrumpPoints: 10,
  lengthBonusThreshold: 2,
  lengthBonusPerExtra: 10,
  minTrumpToSaySuit: 2,
  weakOpenValue: 90,
  strongOpenValue: 100,
  strongOpenMinTrump: 4,
  weakOpenMinTrump: 4,
  weakOpenKeyMinTrump: 3,
  holdAcesOnWeakOpen: true,
  deepThinkTrumpThreshold: 3,
  maxBid: 180,
};

/** État mémoriel d'un robot entre deux tours d'enchère (ex. As gardés). */
export interface BiddingMemory {
  heldAces: number;
}

export interface BiddingConvention {
  readonly id: string;
  config: ConventionConfig;

  /** Aucun partenaire/adversaire n'a encore annoncé : faut-il ouvrir ? */
  evaluateOpening(args: {
    hand: Card[];
    ctx: TableContext;
    memory: BiddingMemory;
    log: RobotLogger;
  }): BidDecision;

  /** Mon partenaire a ouvert : réponse codée (As, Valet, longueur d'atout...). */
  evaluatePartnerResponse(args: {
    hand: Card[];
    ctx: TableContext;
    partnerBid: { value: number; suit: Suit; saidSuit: boolean };
    memory: BiddingMemory;
    log: RobotLogger;
  }): BidDecision;
}
