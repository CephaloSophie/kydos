import { describe, it, expect } from 'vitest';
import { buildSeatModels } from './SeatsLayer';
import type { EngineView } from 'belote-core';

/** Minimal EngineView stub for seat-model tests. */
function mkView(partial: Partial<EngineView>): EngineView {
  return {
    phase: 'bidding', turn: 0, trump: null, bidderSeat: null, dealer: 3, firstBidderSeat: 0,
    currentBidValue: null, contre: 'none', contreSeats: [], surcontreSeats: [], bids: [],
    currentTrick: [], currentTrickLeader: null, awaitingCollect: false, pendingWinnerSeat: null,
    lastTrick: null, manchesWon: { A: 0, B: 0 }, cumulative: { A: 0, B: 0 }, board: { A: 0, B: 0 },
    target: 2, mancheIndex: 0, ...partial,
  } as unknown as EngineView;
}
const NAMES = ['Vous', 'Borée', 'Calliope', 'Damon'];

describe('buildSeatModels — DOM GameTable parity', () => {
  it('marks dealer (D), first bidder (E) and current turn (meneur)', () => {
    const m = buildSeatModels(mkView({ dealer: 3, firstBidderSeat: 0, turn: 1 }), NAMES, false);
    expect(m[3].isDonneur).toBe(true);
    expect(m[0].isEntame).toBe(true);
    expect(m[1].isMeneur).toBe(true);
    expect(m[0].isMeneur).toBe(false);
  });

  it('meneur is suppressed while awaiting trick collect (volatile jeton)', () => {
    const m = buildSeatModels(mkView({ turn: 1, awaitingCollect: true }), NAMES, false);
    expect(m[1].isMeneur).toBe(false);
  });

  it('shows the demande during bidding, suit only when explicitly named', () => {
    const view = mkView({ bids: [
      { seat: 1, action: 'bid', value: 90, suit: 'pique', saidSuit: true } as any,
      { seat: 2, action: 'bid', value: 100, suit: 'coeur', saidSuit: false } as any,
    ] });
    const m = buildSeatModels(view, NAMES, false);
    expect(m[1].demande?.value).toBe(90);
    expect(m[1].demande?.suitSymbol).toBe('♠');   // named suit -> shown
    expect(m[2].demande?.suitSymbol).toBeNull();  // unnamed suit -> hidden
  });

  it('during play, only the bidder shows the retained contract (after the delay)', () => {
    const view = mkView({
      phase: 'playing', trump: 'coeur', bidderSeat: 2, currentBidValue: 110,
      bids: [{ seat: 2, action: 'bid', value: 110, suit: 'coeur', saidSuit: true } as any],
    });
    const hidden = buildSeatModels(view, NAMES, false); // delay not elapsed
    expect(hidden[2].demande).toBeNull();
    const shown = buildSeatModels(view, NAMES, true);   // delay elapsed
    expect(shown[2].demande?.value).toBe(110);
    expect(shown[2].demande?.suitSymbol).toBe('♥');     // retained contract shows real trump
    expect(shown[1].demande).toBeNull();                // others show nothing
  });

  it('contre / surcontre are PERSONAL markers (never team-wide)', () => {
    const view = mkView({ bids: [
      { seat: 1, action: 'contree' } as any,
      { seat: 2, action: 'surcontree' } as any,
    ] });
    const m = buildSeatModels(view, NAMES, false);
    expect(m[1].contre).toBe('contree');
    expect(m[2].contre).toBe('surcontree');
    expect(m[0].contre).toBe('none');
    expect(m[3].contre).toBe('none');
  });

  it('teams follow the design system: seats 0&2 yellow, 1&3 blue', () => {
    const m = buildSeatModels(mkView({}), NAMES, false);
    expect(m[0].team).toBe('yellow');
    expect(m[2].team).toBe('yellow');
    expect(m[1].team).toBe('blue');
    expect(m[3].team).toBe('blue');
  });

  it('attaches robot avatar faces per absolute seat (null for humans/empty)', () => {
    const faces = [null, { accentColor: '#e85d70' }, null, { accentColor: '#7ecb98', bodyColor: '#123456', outlineColor: '#000000' }];
    const m = buildSeatModels(mkView({}), NAMES, false, true, undefined, faces);
    expect(m[0].avatar).toBeNull();
    expect(m[1].avatar?.accentColor).toBe('#e85d70');
    expect(m[3].avatar).toEqual({ accentColor: '#7ecb98', bodyColor: '#123456', outlineColor: '#000000' });
  });

  it('avatar defaults to null when no faces provided', () => {
    const m = buildSeatModels(mkView({}), NAMES, false);
    expect(m.every((x) => x.avatar === null)).toBe(true);
  });
});
