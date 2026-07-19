// ============================================================================
//  RobotBrain — algorithme du robot, VOLONTAIREMENT décomposé en phases
//  claires, chacune truffée de logs (error/warning/info/debug/trace) :
//    evaluateHand -> analyse des cartes reçues
//    decideBid    -> ouverture / réponse / passe (délègue à la convention)
//    decideCard   -> choix de la carte (légalité + agressivité)
//
//  Tourne CÔTÉ FRONT (module pur). Aucune dépendance réseau / websocket.
// ============================================================================

import { cardId, cardStrength, cardValue, cardsOfSuit, SUITS, type Card, type Suit } from '../domain/cards';
import type {
  BidDecision,
  CardDecision,
  RobotConfig,
  Seat,
  TableContext,
} from '../domain/types';
import type { RulesEngine } from '../rules/RulesEngine';
import type { BiddingConvention, BiddingMemory } from './conventions/BiddingConvention';
import type { RobotLogger } from './logger';

export class RobotBrain {
  private memory: BiddingMemory = { heldAces: 0 };

  constructor(
    public robot: RobotConfig,
    public convention: BiddingConvention,
    public rules: RulesEngine,
    public log: RobotLogger,
  ) {}

  /** Phase 1 — analyse de la donne. */
  evaluateHand(hand: Card[]): void {
    this.log.info('analyse', `${this.robot.name} reçoit : ${hand.map(cardId).join(' ')}`);
    for (const suit of SUITS) {
      const cards = cardsOfSuit(hand, suit);
      if (cards.length) {
        this.log.debug('analyse', `${suit} (${cards.length}) : ${cards.map(cardId).join(' ')}`);
      }
    }
  }

  /** Phase 2 — décision d'enchère. */
  decideBid(hand: Card[], ctx: TableContext, mySeat: Seat, partnerSeat: Seat): BidDecision {
    // Le partenaire a-t-il déjà ouvert et reste-t-il le plus offrant ?
    const partnerOpen = [...ctx.bids]
      .reverse()
      .find((b) => b.seat === partnerSeat && b.action === 'bid' && b.value);

    if (partnerOpen && partnerOpen.suit && partnerOpen.value) {
      this.log.trace('enchere', `Partenaire a ouvert ${partnerOpen.value} ${partnerOpen.suit}.`);
      return this.convention.evaluatePartnerResponse({
        hand,
        ctx,
        partnerBid: {
          value: partnerOpen.value,
          suit: partnerOpen.suit,
          saidSuit: !!partnerOpen.saidSuit,
        },
        memory: this.memory,
        log: this.log,
      });
    }

    const anyBid = ctx.bids.some((b) => b.action === 'bid');
    if (!anyBid) {
      return this.convention.evaluateOpening({ hand, ctx, memory: this.memory, log: this.log });
    }

    // Enchère compétitive adverse : v1 simple — on passe (chantier ultérieur).
    this.log.info('enchere', 'Annonce adverse en cours, pas de relance en v1 : je passe.');
    return { action: 'pass', thinkMultiplier: 1, reason: 'pas de relance compétitive en v1' };
  }

  /**
   * Phase 3 — choix de la carte. Pré-validation par les règles (légalité),
   * puis heuristique modulée par l'agressivité.
   *
   * Exemple documenté : si l'on est maître avec Roi ET As de la couleur, on
   * joue la carte gagnante MINIMALE (Roi) avec une probabilité = agressivité*10%,
   * sinon l'As. (agressivité 8/10 -> 80% Roi, 20% As.)
   */
  decideCard(
    hand: Card[],
    ctx: TableContext,
    mySeat: Seat,
    partnerSeat: Seat,
    rng: () => number = Math.random,
  ): CardDecision {
    const trump = ctx.trump as Suit;
    const legal = this.rules.legalMoves({ hand, trick: ctx.currentTrick, trump, mySeat, partnerSeat });
    this.log.info('jeu', `Cartes jouables : ${legal.map(cardId).join(' ')}`);

    if (legal.length === 1) {
      this.log.debug('jeu', `Coup forcé : ${cardId(legal[0])}`);
      return { card: legal[0], thinkMultiplier: 1, reason: 'coup forcé' };
    }

    // Cartes qui REMPORTENT le pli si on les joue.
    const winning = legal.filter((card) => this.wouldWin(card, ctx, trump));
    if (winning.length > 0) {
      winning.sort((a, b) => cardStrength(a, trump) - cardStrength(b, trump));
      const minWinning = winning[0]; // gagnante la plus faible (réserve)
      const maxWinning = winning[winning.length - 1]; // gagnante la plus forte

      const pMin = Math.min(1, Math.max(0, this.robot.personality.aggressiveness / 10));
      const roll = rng();
      const chosen = roll < pMin ? minWinning : maxWinning;
      this.log.info(
        'jeu',
        `Maître possible. p(carte minimale)=${(pMin * 100).toFixed(0)}% tirage=${roll.toFixed(2)} -> ${cardId(chosen)}`,
      );
      return { card: chosen, thinkMultiplier: 1, reason: `choix modulé par agressivité (${cardId(minWinning)}/${cardId(maxWinning)})` };
    }

    // Sinon : on se défausse de la plus petite valeur.
    const sorted = [...legal].sort((a, b) => cardValue(a, trump) - cardValue(b, trump));
    this.log.info('jeu', `Aucune carte gagnante : défausse ${cardId(sorted[0])}.`);
    return { card: sorted[0], thinkMultiplier: 1, reason: 'défausse minimale' };
  }

  private wouldWin(card: Card, ctx: TableContext, trump: Suit): boolean {
    const trial = [...ctx.currentTrick, { seat: 0 as Seat, card }];
    const winnerIdx = this.rules.trickWinnerIndex(trial, trump);
    return winnerIdx === trial.length - 1;
  }
}
