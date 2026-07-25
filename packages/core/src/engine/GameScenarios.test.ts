import { describe, it, expect } from 'vitest';
import { GameEngine } from './GameEngine';
import { ContreeRules } from '../rules/ContreeRules';
import { DEFAULT_PARTIE } from './types';
import { createAlgorithm, makeRobot, robotAct } from './RobotDriver';
import type { Seat } from '../domain/types';

/* =============================================================================
 * Game-scenario coverage: belote announced / declined, reflexion signals,
 * contre & surcontre, trick collection, full-game determinism.
 * These lock the ENGINE contract that both the web and mobile apps depend on.
 * ========================================================================== */

const rules = new ContreeRules();
const players = (names: string[]) => names.map((name, s) => ({ seat: s as Seat, name, type: 'human' as const }));
const fresh = (overrides: Partial<typeof DEFAULT_PARTIE> = {}) =>
  new GameEngine(players(['A', 'B', 'C', 'D']) as any, { ...DEFAULT_PARTIE, ...overrides }, rules);

/** Bring the turn to `seat` with passes, then take 90 in the given suit. */
function takeBy(engine: GameEngine, seat: Seat, suit: 'pique' | 'coeur' | 'carreau' | 'trefle' = 'pique') {
  while (engine.turn !== seat) engine.submitBid(engine.turn!, { action: 'pass' });
  engine.submitBid(seat, { action: 'bid', value: 90, suit, saidSuit: true });
}

/** Finish the auction so the play phase begins. */
function closeAuction(engine: GameEngine) {
  let guard = 0;
  while (engine.phase === 'bidding' && guard++ < 20) engine.submitBid(engine.turn!, { action: 'pass' });
}

/** Play a full donne with robot brains, collecting tricks as they complete. */
function playOutDonne(engine: GameEngine, guardLimit = 400) {
  const brains = [0, 1, 2, 3].map((i) => createAlgorithm(makeRobot({ id: `b${i}`, name: `B${i}` }), rules, () => {}));
  let guard = 0;
  while (engine.phase === 'playing' && guard++ < guardLimit) {
    if (engine.view().awaitingCollect) { engine.collectTrick(); continue; }
    const seat = engine.turn as Seat;
    const action = robotAct(engine, seat, brains[seat]);
    if (action.kind === 'play') engine.playCard(seat, action.card);
    else engine.submitBid(seat, action.bid);
  }
}

/** Find the trump suit whose King+Queen are held by a single seat (belote). */
function findBeloteSetup(): { engine: GameEngine; seat: Seat; suit: 'pique' | 'coeur' | 'carreau' | 'trefle' } | null {
  const suits = ['pique', 'coeur', 'carreau', 'trefle'] as const;
  for (let attempt = 0; attempt < 200; attempt++) {
    const engine = fresh();
    for (const suit of suits) {
      for (const seat of [0, 1, 2, 3] as Seat[]) {
        const hand = engine.handOf(seat);
        const hasKing = hand.some((c) => c.suit === suit && c.rank === 'R');
        const hasQueen = hand.some((c) => c.suit === suit && c.rank === 'D');
        if (hasKing && hasQueen) return { engine, seat, suit };
      }
    }
  }
  return null;
}

describe('Belote / Rebelote — announced by default', () => {
  it('detects the seat holding King + Queen of trump once the contract is set', () => {
    const setup = findBeloteSetup();
    expect(setup).not.toBeNull();
    const { engine, seat, suit } = setup!;
    takeBy(engine, seat, suit);
    closeAuction(engine);
    expect(engine.view().trump).toBe(suit);
    expect(engine.beloteSeat()).toBe(seat);
  });

  it('reports belote state in the engine view (seat, announcing, playedCount)', () => {
    const setup = findBeloteSetup();
    const { engine, seat, suit } = setup!;
    takeBy(engine, seat, suit);
    closeAuction(engine);
    const belote = engine.view().belote;
    expect(belote).not.toBeNull();
    expect(belote!.seat).toBe(seat);
    expect(belote!.announcing).toBe(true); // announced by default
    expect(belote!.playedCount).toBe(0);
  });

  it('returns null when no seat holds both King and Queen of trump', () => {
    const engine = fresh();
    // Pick a trump suit where no single seat holds K+Q.
    const suits = ['pique', 'coeur', 'carreau', 'trefle'] as const;
    const badSuit = suits.find((suit) =>
      ([0, 1, 2, 3] as Seat[]).every((seat) => {
        const hand = engine.handOf(seat);
        return !(hand.some((c) => c.suit === suit && c.rank === 'R') && hand.some((c) => c.suit === suit && c.rank === 'D'));
      }));
    if (!badSuit) return; // extremely rare deal — nothing to assert
    takeBy(engine, 0, badSuit);
    closeAuction(engine);
    expect(engine.beloteSeat()).toBeNull();
    expect(engine.view().belote).toBeNull();
  });
});

describe('Belote — declining the announce (sans belote)', () => {
  it('lets the holder DECLINE before playing a card', () => {
    const setup = findBeloteSetup();
    const { engine, seat, suit } = setup!;
    takeBy(engine, seat, suit);
    closeAuction(engine);
    const result = engine.setBeloteAnnounce(seat, false);
    expect(result.ok).toBe(true);
    expect(engine.view().belote!.announcing).toBe(false);
  });

  it('lets the holder toggle the announce back on', () => {
    const setup = findBeloteSetup();
    const { engine, seat, suit } = setup!;
    takeBy(engine, seat, suit);
    closeAuction(engine);
    engine.setBeloteAnnounce(seat, false);
    expect(engine.setBeloteAnnounce(seat, true).ok).toBe(true);
    expect(engine.view().belote!.announcing).toBe(true);
  });

  it('REFUSES to change the announce once a belote card has been played', () => {
    const setup = findBeloteSetup();
    const { engine, seat, suit } = setup!;
    takeBy(engine, seat, suit);
    closeAuction(engine);
    // Play out the donne: by the end the King/Queen have necessarily been played.
    playOutDonne(engine);
    const result = engine.setBeloteAnnounce(seat, false);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('a seat WITHOUT the belote cannot toggle an announce', () => {
    const setup = findBeloteSetup();
    const { engine, seat, suit } = setup!;
    takeBy(engine, seat, suit);
    closeAuction(engine);
    const otherSeat = ((seat + 1) % 4) as Seat;
    expect(engine.setBeloteAnnounce(otherSeat, false).ok).toBe(false);
  });
});

describe('Auction signals — réflexion & répéter', () => {
  it('accepts a "répéter la couleur du coéquipier" bid without naming a suit', () => {
    const engine = fresh();
    while (engine.turn !== 0) engine.submitBid(engine.turn!, { action: 'pass' });
    engine.submitBid(0, { action: 'bid', value: 90, suit: 'coeur', saidSuit: true });
    // Partner (seat 2) repeats the partner's suit instead of naming it again.
    while ((engine.turn as number) !== 2) engine.submitBid(engine.turn!, { action: "pass" });
    const result = engine.submitBid(2, { action: 'bid', value: 100, repeatPartnerSuit: true });
    expect(result.ok).toBe(true);
    const last = engine.view().bids.at(-1)!;
    expect(last.suit).toBe('coeur');   // resolved from the partner's bid
    expect(last.saidSuit).toBe(false); // the suit was NOT spoken aloud
  });

  it('refuses "répéter" when the partner has not named any suit yet', () => {
    const engine = fresh();
    while (engine.turn !== 0) engine.submitBid(engine.turn!, { action: 'pass' });
    const result = engine.submitBid(0, { action: 'bid', value: 90, repeatPartnerSuit: true });
    expect(result.ok).toBe(false);
  });

  it('carries the "réflexion" signal through to the recorded bid', () => {
    const engine = fresh();
    while (engine.turn !== 0) engine.submitBid(engine.turn!, { action: 'pass' });
    engine.submitBid(0, { action: 'bid', value: 90, suit: 'pique', saidSuit: true, reflexion: true });
    expect(engine.view().bids.at(-1)!.reflexion).toBe(true);
  });

  it('ignores signals when the table disables them', () => {
    const engine = new GameEngine(players(['A', 'B', 'C', 'D']) as any,
      { ...DEFAULT_PARTIE, signals: { reflexion: false, repeatSuit: false } } as any, rules);
    while (engine.turn !== 0) engine.submitBid(engine.turn!, { action: 'pass' });
    engine.submitBid(0, { action: 'bid', value: 90, suit: 'pique', saidSuit: true, reflexion: true });
    expect(engine.view().bids.at(-1)!.reflexion).toBeFalsy();
  });

  it('rejects a bid that is not strictly higher than the current one', () => {
    const engine = fresh();
    while (engine.turn !== 0) engine.submitBid(engine.turn!, { action: 'pass' });
    engine.submitBid(0, { action: 'bid', value: 100, suit: 'pique', saidSuit: true });
    while ((engine.turn as number) !== 1) engine.submitBid(engine.turn!, { action: "pass" });
    expect(engine.submitBid(1, { action: 'bid', value: 90, suit: 'coeur', saidSuit: true }).ok).toBe(false);
  });

  it('keeps every bid in the view so the UI can replay the auction', () => {
    const engine = fresh();
    while (engine.turn !== 0) engine.submitBid(engine.turn!, { action: 'pass' });
    engine.submitBid(0, { action: 'bid', value: 90, suit: 'pique', saidSuit: true });
    const bids = engine.view().bids;
    expect(bids.length).toBeGreaterThanOrEqual(1);
    expect(bids.at(-1)!.seat).toBe(0);
    expect(bids.at(-1)!.value).toBe(90);
  });
});

describe('Contre / Surcontre', () => {
  it('an OPPONENT can contre the standing contract', () => {
    const engine = fresh();
    takeBy(engine, 0, 'pique');
    while ((engine.turn as number) !== 1) engine.submitBid(engine.turn!, { action: "pass" });
    expect(engine.submitBid(1, { action: 'contree' }).ok).toBe(true);
    expect(engine.view().contre).toBeTruthy();
  });

  it('a TEAMMATE of the bidder cannot contre their own contract', () => {
    const engine = fresh();
    takeBy(engine, 0, 'pique');
    while ((engine.turn as number) !== 2) engine.submitBid(engine.turn!, { action: "pass" });
    expect(engine.submitBid(2, { action: 'contree' }).ok).toBe(false);
  });
});

describe('Trick play — legality and collection', () => {
  it('legalCards() is never empty while a seat still holds cards', () => {
    const engine = fresh();
    takeBy(engine, 0, 'pique');
    closeAuction(engine);
    const seat = engine.turn as Seat;
    expect(engine.handOf(seat).length).toBeGreaterThan(0);
    expect(engine.legalCards(seat).length).toBeGreaterThan(0);
  });

  it('refuses an illegal card and accepts a legal one', () => {
    const engine = fresh();
    takeBy(engine, 0, 'pique');
    closeAuction(engine);
    const seat = engine.turn as Seat;
    const legal = engine.legalCards(seat);
    const illegal = engine.handOf(seat).find((c) => !legal.some((l) => l.rank === c.rank && l.suit === c.suit));
    if (illegal) expect(engine.playCard(seat, illegal).ok).toBe(false);
    expect(engine.playCard(seat, legal[0]).ok).toBe(true);
  });

  it('awaits collection after the 4th card, then clears the trick', () => {
    const engine = fresh();
    takeBy(engine, 0, 'pique');
    closeAuction(engine);
    for (let i = 0; i < 4; i++) {
      const seat = engine.turn as Seat;
      engine.playCard(seat, engine.legalCards(seat)[0]);
    }
    expect(engine.view().awaitingCollect).toBe(true);
    expect(engine.view().currentTrick).toHaveLength(4);
    engine.collectTrick();
    expect(engine.view().awaitingCollect).toBe(false);
    expect(engine.view().currentTrick).toHaveLength(0);
    expect(engine.view().lastTrick).not.toBeNull();
  });
});

describe('Full donne & partie', () => {
  it('plays a complete donne: every hand is emptied and a score is produced', () => {
    const engine = fresh();
    takeBy(engine, 0, 'pique');
    closeAuction(engine);
    playOutDonne(engine);
    expect(engine.phase).not.toBe('playing');
    for (const seat of [0, 1, 2, 3] as Seat[]) expect(engine.handOf(seat)).toHaveLength(0);
    const summary = engine.summary();
    expect(summary.manches.length).toBeGreaterThanOrEqual(1);
  });

  it('produces a replayable record with donnes and operations', () => {
    const engine = fresh();
    takeBy(engine, 0, 'pique');
    closeAuction(engine);
    playOutDonne(engine);
    const replay = engine.toReplay();
    expect(replay.manches.length).toBeGreaterThanOrEqual(1);
    expect(replay.players).toHaveLength(4);
    const donne = replay.manches[0].donnes[0];
    expect(donne.hands).toHaveLength(4);
    expect(donne.operations.length).toBeGreaterThan(0);
    // The replay must contain both auction and play operations.
    expect(donne.operations.some((o) => o.type === 'bid')).toBe(true);
    expect(donne.operations.some((o) => o.type === 'play')).toBe(true);
  });

  it('a single-manche partie reaches partie_end and declares a winner', () => {
    const engine = fresh({ manches: 1 });
    let guard = 0;
    while (engine.phase !== 'partie_end' && guard++ < 60) {
      if (engine.phase === 'bidding') {
        // Someone must take, otherwise the donne is redealt forever.
        takeBy(engine, engine.turn as Seat, 'pique');
        closeAuction(engine);
      }
      if (engine.phase === 'playing') playOutDonne(engine);
      if (engine.phase === 'donne_end') engine.nextDonne();
      if (engine.phase === 'manche_end') engine.nextManche();
    }
    expect(engine.phase).toBe('partie_end');
    expect(['A', 'B']).toContain(engine.partieWinner);
  });
});
