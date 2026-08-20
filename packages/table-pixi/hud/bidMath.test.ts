// Unit tests for the bid panel logic (pure functions, no Pixi/DOM needed).
import { describe, expect, it } from 'vitest';
import type { Bid, EngineView, Seat } from 'belote-core';
import {
  CAPOT, availableSteps, defaultStep, isValueAvailable, lastSaidSuitOf,
  minBidValue, partnerSaidSuit, stepDown, stepUp, suivreBid,
} from './bidMath';

const view = (currentBidValue: number | null, bids: Partial<Bid & { seat: Seat }>[] = []) =>
  ({ currentBidValue, bids: bids as Bid[] }) as unknown as Pick<EngineView, 'currentBidValue' | 'bids'>;

// v17 — vue avec enchère d'ouverture configurée (minBid).
const viewMin = (minBid: number, currentBidValue: number | null = null) =>
  ({ currentBidValue, minBid, maxBid: 180, bids: [] as Bid[] }) as unknown as Pick<EngineView, 'currentBidValue' | 'bids' | 'minBid' | 'maxBid'>;

describe('minBidValue / isValueAvailable', () => {
  it('empty auction: minimum is 90 and the whole ladder is available', () => {
    expect(minBidValue(view(null))).toBe(90);
    for (const v of [90, 100, 110, 120, 130, 140, 150, 160, 170, 180]) {
      expect(isValueAvailable(view(null), v)).toBe(true);
    }
  });

  it('after a 110 announce, nobody can announce less than 120', () => {
    const v = view(110);
    expect(minBidValue(v)).toBe(120);
    // 90, 100 and 110 are NO LONGER available.
    expect(isValueAvailable(v, 90)).toBe(false);
    expect(isValueAvailable(v, 100)).toBe(false);
    expect(isValueAvailable(v, 110)).toBe(false);
    // 120..180 are all still available.
    for (const x of [120, 130, 140, 150, 160, 170, 180]) {
      expect(isValueAvailable(v, x)).toBe(true);
    }
  });

  it('rejects non-multiples of 10 outright', () => {
    expect(isValueAvailable(view(null), 151)).toBe(false);
    expect(isValueAvailable(view(100), 115)).toBe(false);
  });

  it('after 180, only capot remains', () => {
    const steps = availableSteps(view(180));
    expect(steps).toEqual([CAPOT]);
  });
});

describe('availableSteps / defaultStep', () => {
  it('lists 120..180 then capot after a 110 announce', () => {
    expect(availableSteps(view(110))).toEqual([120, 130, 140, 150, 160, 170, 180, CAPOT]);
  });

  it('capot is ALWAYS announceable', () => {
    expect(availableSteps(view(null))).toContain(CAPOT);
    expect(availableSteps(view(180))).toContain(CAPOT);
  });

  it('default step is last announce + 10', () => {
    expect(defaultStep(view(null))).toBe(90);
    expect(defaultStep(view(100))).toBe(110);
    expect(defaultStep(view(180))).toBe(CAPOT);
  });
});

describe('stepUp / stepDown', () => {
  it('steps by tens and reaches capot after 180', () => {
    const v = view(null);
    expect(stepUp(v, 90)).toBe(100);
    expect(stepUp(v, 180)).toBe(CAPOT);
    expect(stepUp(v, CAPOT)).toBe(CAPOT); // capped
  });

  it('never steps below the legal minimum', () => {
    const v = view(110); // min 120
    expect(stepDown(v, 120)).toBe(120);
    expect(stepDown(v, 130)).toBe(120);
  });
});

describe('lastSaidSuitOf / partnerSaidSuit', () => {
  it('ignores suits that were not SAID out loud', () => {
    const v = view(100, [
      { seat: 2 as Seat, action: 'bid', value: 90, suit: 'coeur', saidSuit: false },
      { seat: 2 as Seat, action: 'bid', value: 100, suit: 'pique', saidSuit: true },
    ]);
    expect(lastSaidSuitOf(v, 2 as Seat)).toBe('pique');
  });

  it('partnerSaidSuit reads the seat across the table', () => {
    const v = view(90, [{ seat: 2 as Seat, action: 'bid', value: 90, suit: 'trefle', saidSuit: true }]);
    expect(partnerSaidSuit(v, 0 as Seat)).toBe('trefle');
    expect(partnerSaidSuit(v, 1 as Seat)).toBe(null);
  });
});

describe('suivreBid', () => {
  it('raises by 10 with MY last said suit, without reflexion', () => {
    const v = view(120, [{ seat: 0 as Seat, action: 'bid', value: 100, suit: 'coeur', saidSuit: true }]);
    expect(suivreBid(v, 0 as Seat)).toEqual({ action: 'bid', value: 130, suit: 'coeur', saidSuit: true });
  });

  it("falls back to repeating the partner's suit", () => {
    const v = view(120, [{ seat: 2 as Seat, action: 'bid', value: 120, suit: 'pique', saidSuit: true }]);
    expect(suivreBid(v, 0 as Seat)).toEqual({ action: 'bid', value: 130, repeatPartnerSuit: true });
  });

  it('is impossible when neither me nor my partner said a suit', () => {
    const v = view(120, [{ seat: 1 as Seat, action: 'bid', value: 120, suit: 'pique', saidSuit: true }]);
    expect(suivreBid(v, 0 as Seat)).toBe(null);
  });

  it('is impossible above 180 (ladder exhausted)', () => {
    const v = view(180, [{ seat: 0 as Seat, action: 'bid', value: 180, suit: 'coeur', saidSuit: true }]);
    expect(suivreBid(v, 0 as Seat)).toBe(null);
  });
});

describe('v17 — enchère d’ouverture configurable (minBid)', () => {
  it('minBid=80 : l’enchère minimale et le premier pas partent de 80', () => {
    expect(minBidValue(viewMin(80))).toBe(80);
    expect(defaultStep(viewMin(80))).toBe(80);
    expect(isValueAvailable(viewMin(80), 80)).toBe(true);
  });

  it('minBid=80 : 80 disponible, la montée d’un cran donne 90', () => {
    const steps = availableSteps(viewMin(80));
    expect(steps[0]).toBe(80);
    expect(steps[1]).toBe(90);
    expect(stepUp(viewMin(80), 80)).toBe(90);
  });

  it('minBid=100 : l’échelle démarre à 100 (80 et 90 exclus)', () => {
    expect(minBidValue(viewMin(100))).toBe(100);
    expect(isValueAvailable(viewMin(100), 80)).toBe(false);
    expect(isValueAvailable(viewMin(100), 90)).toBe(false);
    expect(isValueAvailable(viewMin(100), 100)).toBe(true);
  });

  it('sans minBid dans la vue : repli sur 90 (compat)', () => {
    expect(minBidValue(view(null))).toBe(90);
    expect(defaultStep(view(null))).toBe(90);
  });
});
