import type { Bid, EngineView, Seat, Suit } from 'belote-core';

/**
 * bidMath — pure logic behind the bid panel (stepper, availability, "Suivre").
 * Values are the Contrée ladder: 90 → 180 by tens, then CAPOT.
 */

export const BID_LADDER = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180] as const;
export const CAPOT = 'capot' as const;
export type BidStep = number | typeof CAPOT;

/** Highest announced value in the auction (null when nobody bid yet). */
export function highestBidValue(view: Pick<EngineView, 'currentBidValue'>): number | null {
  return view.currentBidValue ?? null;
}

/** Minimum announceable value: last bid + 10, or 90 on an empty auction. */
export function minBidValue(view: Pick<EngineView, 'currentBidValue'>): number {
  const h = highestBidValue(view);
  return h ? h + 10 : 90;
}

/** True when `value` can still be announced. */
export function isValueAvailable(view: Pick<EngineView, 'currentBidValue'>, value: number): boolean {
  return value % 10 === 0 && value >= minBidValue(view) && value <= 180;
}

/** Every step still available, capot included (capot is always announceable). */
export function availableSteps(view: Pick<EngineView, 'currentBidValue'>): BidStep[] {
  const steps: BidStep[] = BID_LADDER.filter((v) => isValueAvailable(view, v));
  steps.push(CAPOT);
  return steps;
}

/** Default stepper position: the FIRST available step (last bid + 10, or capot). */
export function defaultStep(view: Pick<EngineView, 'currentBidValue'>): BidStep {
  return availableSteps(view)[0];
}

/** One step up in the ladder (180 → capot; capot stays capot). */
export function stepUp(view: Pick<EngineView, 'currentBidValue'>, current: BidStep): BidStep {
  const steps = availableSteps(view);
  const i = steps.findIndex((s) => s === current);
  return i < 0 ? steps[0] : steps[Math.min(steps.length - 1, i + 1)];
}

/** One step down (never below the minimum available step). */
export function stepDown(view: Pick<EngineView, 'currentBidValue'>, current: BidStep): BidStep {
  const steps = availableSteps(view);
  const i = steps.findIndex((s) => s === current);
  return i < 0 ? steps[0] : steps[Math.max(0, i - 1)];
}

/** Last suit SAID by a given seat in the auction (null if none). */
export function lastSaidSuitOf(view: Pick<EngineView, 'bids'>, seat: Seat): Suit | null {
  for (let i = view.bids.length - 1; i >= 0; i--) {
    const b = view.bids[i];
    if (b.seat === seat && b.suit && b.saidSuit) return b.suit;
  }
  return null;
}

/** Partner's last said suit — powers the "repeat partner suit" icon. */
export function partnerSaidSuit(view: Pick<EngineView, 'bids'>, mySeat: Seat): Suit | null {
  return lastSaidSuitOf(view, ((mySeat + 2) % 4) as Seat);
}

/**
 * "Suivre" = raise the last announce by 10, keeping MY SIDE's last said suit
 * (mine, or my partner's via repeat), without reflexion.
 * Returns null when it's impossible (no side suit, or ladder exhausted).
 */
export function suivreBid(
  view: Pick<EngineView, 'currentBidValue' | 'bids'>, mySeat: Seat,
): Omit<Bid, 'seat'> | null {
  const min = minBidValue(view);
  if (min > 180) return null;
  const mySuit = lastSaidSuitOf(view, mySeat);
  if (mySuit) return { action: 'bid', value: min, suit: mySuit, saidSuit: true };
  const partner = partnerSaidSuit(view, mySeat);
  if (partner) return { action: 'bid', value: min, repeatPartnerSuit: true };
  return null;
}
