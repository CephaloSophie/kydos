import { SUIT_SYMBOL, type EngineView, type Seat } from 'belote-core';

/**
 * announceBubbles — pure logic for the per-seat announce bubbles shown at the
 * right end of each player's hand:
 * - during BIDDING every seat shows its LAST action (including "Passe");
 * - once the auction is over, only the TAKER's contract, COINCHÉ and SURCOINCHÉ remain.
 */

export interface AnnounceBubble {
  seat: Seat;
  kind: 'bid' | 'capot' | 'pass' | 'coinche' | 'surcoinche' | 'contract';
  /** Main text ("110", "Passe", "COINCHÉ", "CAPOT"…). */
  text: string;
  /** Trump/suit symbol to append, with its own color. */
  suitSymbol?: string;
  suitIsRed?: boolean;
  /** Append the reflexion icon (already time-windowed by the caller). */
  reflexion?: boolean;
}

const isRed = (s: string) => s === 'coeur' || s === 'carreau';

/** The bubble of one seat, or null when it has nothing to show. */
export function bubbleOf(view: EngineView, seat: Seat, showReflexion: boolean): AnnounceBubble | null {
  const lastActionOf = () => {
    for (let i = view.bids.length - 1; i >= 0; i--) if (view.bids[i].seat === seat) return view.bids[i];
    return null;
  };

  if (view.phase === 'bidding' || view.phase === 'surcontre') {
    const b = lastActionOf();
    if (!b) return null;
    if (b.action === 'pass') return { seat, kind: 'pass', text: 'Passe' };
    if (b.action === 'contree') return { seat, kind: 'coinche', text: 'COINCHÉ' };
    if (b.action === 'surcontree') return { seat, kind: 'surcoinche', text: 'SURCOINCHÉ' };
    const sym = b.saidSuit && b.suit ? SUIT_SYMBOL[b.suit] : undefined;
    return {
      seat,
      kind: b.action === 'capot' ? 'capot' : 'bid',
      text: b.action === 'capot' ? 'CAPOT' : String(Math.floor((b.value ?? 0) / 10) * 10),
      suitSymbol: sym,
      suitIsRed: b.suit ? isRed(b.suit) : false,
      reflexion: showReflexion && !!b.reflexion,
    };
  }

  // Auction done: taker's contract + contre/surcontre markers only.
  const lastSeatOf = (action: 'contree' | 'surcontree'): Seat | null => {
    for (let i = view.bids.length - 1; i >= 0; i--) if (view.bids[i].action === action) return view.bids[i].seat;
    return null;
  };
  if (seat === lastSeatOf('surcontree')) return { seat, kind: 'surcoinche', text: 'SURCOINCHÉ' };
  if (seat === lastSeatOf('contree')) return { seat, kind: 'coinche', text: 'COINCHÉ' };
  if (seat === view.bidderSeat && view.currentBidValue != null) {
    const capot = view.bids.some((b) => b.seat === seat && b.action === 'capot');
    const takerBid = [...view.bids].reverse().find((b) => b.seat === seat && (b.action === 'bid' || b.action === 'capot'));
    return {
      seat,
      kind: 'contract',
      text: capot ? 'CAPOT' : String(Math.floor(view.currentBidValue / 10) * 10),
      suitSymbol: view.trump ? SUIT_SYMBOL[view.trump] : undefined,
      suitIsRed: view.trump ? isRed(view.trump) : false,
      reflexion: showReflexion && !!takerBid?.reflexion,
    };
  }
  return null;
}

/** All four bubbles (null entries dropped). */
export function buildAnnounceBubbles(view: EngineView, showReflexion: boolean): AnnounceBubble[] {
  return ([0, 1, 2, 3] as Seat[])
    .map((s) => bubbleOf(view, s, showReflexion))
    .filter((b): b is AnnounceBubble => b !== null);
}
