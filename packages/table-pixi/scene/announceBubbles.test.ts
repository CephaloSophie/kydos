// Unit tests for the per-seat announce bubbles (pure logic).
import { describe, expect, it } from 'vitest';
import type { Bid, EngineView, Seat } from 'belote-core';
import { bubbleOf, buildAnnounceBubbles } from './announceBubbles';

const mkView = (over: Partial<EngineView>): EngineView =>
  ({
    phase: 'bidding', turn: 0, trump: null, bidderSeat: null, dealer: 0, firstBidderSeat: 1,
    currentBidValue: null, contre: 'none', contreSeats: [], surcontreSeats: [], bids: [],
    currentTrick: [], currentTrickLeader: null, awaitingCollect: false, pendingWinnerSeat: null,
    lastTrick: null, manchesWon: { A: 0, B: 0 }, cumulative: { A: 0, B: 0 },
    belote: null, board: {} as any, target: 1000, mancheIndex: 0,
    ...over,
  }) as unknown as EngineView;

const bid = (seat: number, action: Bid['action'], value?: number, suit?: any, saidSuit = true, reflexion = false): Bid =>
  ({ seat: seat as Seat, action, value, suit, saidSuit, reflexion }) as Bid;

describe('bubbleOf — bidding phase', () => {
  it('shows EVERY seat’s last action, Passe included', () => {
    const v = mkView({
      phase: 'bidding',
      bids: [bid(1, 'bid', 90, 'pique'), bid(2, 'pass'), bid(3, 'bid', 100, 'coeur'), bid(0, 'pass')],
    });
    const bubbles = buildAnnounceBubbles(v, true);
    expect(bubbles).toHaveLength(4);
    expect(bubbleOf(v, 0 as Seat, true)).toMatchObject({ kind: 'pass', text: 'Passe' });
    expect(bubbleOf(v, 1 as Seat, true)).toMatchObject({ kind: 'bid', text: '90', suitSymbol: '♠', suitIsRed: false });
    expect(bubbleOf(v, 3 as Seat, true)).toMatchObject({ kind: 'bid', text: '100', suitSymbol: '♥', suitIsRed: true });
  });

  it('keeps only the LAST action of a seat', () => {
    const v = mkView({ phase: 'bidding', bids: [bid(1, 'bid', 90, 'pique'), bid(1, 'bid', 110, 'trefle')] });
    expect(bubbleOf(v, 1 as Seat, true)).toMatchObject({ text: '110', suitSymbol: '♣' });
  });

  it('shows the reflexion icon only inside its time window', () => {
    const v = mkView({ phase: 'bidding', bids: [bid(1, 'bid', 90, 'pique', true, true)] });
    expect(bubbleOf(v, 1 as Seat, true)!.reflexion).toBe(true);
    expect(bubbleOf(v, 1 as Seat, false)!.reflexion).toBe(false);
  });

  it('floors odd values to the ten for display', () => {
    const v = mkView({ phase: 'bidding', bids: [bid(1, 'bid', 151, 'pique')] });
    expect(bubbleOf(v, 1 as Seat, true)!.text).toBe('150');
  });
});

describe('bubbleOf — after the auction', () => {
  const base = mkView({
    phase: 'playing', trump: 'coeur', bidderSeat: 2 as Seat, currentBidValue: 110,
    bids: [bid(1, 'pass'), bid(2, 'bid', 110, 'coeur'), bid(3, 'pass'), bid(0, 'pass')],
  });

  it('only the taker keeps a bubble (its contract, colored trump)', () => {
    const bubbles = buildAnnounceBubbles(base, false);
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0]).toMatchObject({ seat: 2, kind: 'contract', text: '110', suitSymbol: '♥', suitIsRed: true });
  });

  it('COINCHÉ and SURCOINCHÉ bubbles persist during play', () => {
    const v = mkView({
      ...base, bids: [...base.bids, bid(3, 'contree'), bid(2, 'surcontree')],
    });
    expect(bubbleOf(v, 3 as Seat, false)).toMatchObject({ kind: 'coinche', text: 'COINCHÉ' });
    expect(bubbleOf(v, 2 as Seat, false)).toMatchObject({ kind: 'surcoinche', text: 'SURCOINCHÉ' });
  });

  it('a capot contract reads CAPOT', () => {
    const v = mkView({
      phase: 'playing', trump: 'pique', bidderSeat: 1 as Seat, currentBidValue: 250,
      bids: [bid(1, 'capot', undefined, 'pique')],
    });
    expect(bubbleOf(v, 1 as Seat, false)).toMatchObject({ kind: 'contract', text: 'CAPOT', suitSymbol: '♠' });
  });
});
