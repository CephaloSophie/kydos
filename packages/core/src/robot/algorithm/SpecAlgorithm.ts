// ============================================================================
//  SpecAlgorithm — algorithme PILOTÉ PAR LE JSON (AlgoSpec).
//  Enchère/carte délèguent au cerveau de convention (logique vérifiée) ;
//  contre/surcontre sont des heuristiques pures paramétrées par la spec.
// ============================================================================

import type { Card, Suit } from '../../domain/cards';
import type { BidDecision, CardDecision } from '../../domain/types';
import type { AlgoSpec } from '../AlgoSpec';
import type { RobotBrain } from '../RobotBrain';
import type { RobotAlgorithm, RobotContext } from './RobotAlgorithm';

export class SpecAlgorithm implements RobotAlgorithm {
  readonly id: string;
  readonly name: string;

  constructor(
    private readonly brain: RobotBrain,
    readonly spec: AlgoSpec,
    readonly responseTimeMs: number,
    readonly maxPlayTimeMs: number,
  ) {
    this.id = `spec:${spec.name}`;
    this.name = spec.name;
  }

  decideBid(ctx: RobotContext): BidDecision {
    return this.brain.decideBid(ctx.hand, ctx.table, ctx.seat, ctx.partnerSeat);
  }

  decideCard(ctx: RobotContext): CardDecision {
    return this.brain.decideCard(ctx.hand, ctx.table, ctx.seat, ctx.partnerSeat);
  }

  /** Estimation pure du « risque de chute adverse » comparée au seuil de la spec. */
  shouldContre(ctx: RobotContext): boolean {
    if (!this.spec.contre.enabled || !ctx.legalBidInfo.canContre) return false;
    const bid = ctx.table.currentBid;
    if (!bid?.suit) return false;
    const risk = this.opponentFailRisk(ctx, bid.suit, bid.value ?? 90);
    return risk >= this.spec.contre.minOpponentRiskToContre;
  }

  shouldSurcontre(ctx: RobotContext): boolean {
    if (!this.spec.contre.enabled || !ctx.legalBidInfo.canSurcontre) return false;
    const bid = ctx.table.currentBid;
    if (!bid?.suit) return false;
    const strength = this.ownStrength(ctx, bid.suit);
    return strength >= this.spec.contre.minOwnStrengthToSurcontre;
  }

  // --- heuristiques pures -----------------------------------------------------

  private trumps(ctx: RobotContext, trump: Suit): Card[] {
    return ctx.hand.filter((c) => c.suit === trump);
  }

  private opponentFailRisk(ctx: RobotContext, trump: Suit, value: number): number {
    const t = this.trumps(ctx, trump);
    const strong = t.some((c) => c.rank === 'V' || c.rank === '9');
    const aces = ctx.hand.filter((c) => c.rank === 'A' && c.suit !== trump).length;
    let risk = (value - 80) / 120; // contrat élevé => plus de chances de chute
    risk += t.length >= 3 ? 0.25 : t.length >= 2 ? 0.12 : 0;
    risk += strong ? 0.2 : 0;
    risk += aces * 0.08;
    risk += (ctx.personality.aggressiveness - 5) * 0.03; // tempérament
    return Math.max(0, Math.min(1, risk));
  }

  private ownStrength(ctx: RobotContext, trump: Suit): number {
    const t = this.trumps(ctx, trump);
    const hasJack = t.some((c) => c.rank === 'V');
    const hasNine = t.some((c) => c.rank === '9');
    const aces = ctx.hand.filter((c) => c.rank === 'A').length;
    let s = t.length * 0.12 + (hasJack ? 0.3 : 0) + (hasNine ? 0.2 : 0) + aces * 0.1;
    s += (ctx.personality.aggressiveness - 5) * 0.02;
    return Math.max(0, Math.min(1, s));
  }
}
