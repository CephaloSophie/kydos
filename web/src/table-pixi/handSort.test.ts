import { describe, it, expect } from 'vitest';
import { suitOrder, displaySort } from './handSort';
import type { Card } from 'belote-core';

describe('hand display ordering', () => {
  // Trump always comes first; remaining suits alternate colors.
  it('suitOrder puts trump first then alternates colors', () => {
    expect(suitOrder('pique')[0]).toBe('pique');      // black trump first
    expect(suitOrder('coeur')[0]).toBe('coeur');      // red trump first
    expect(suitOrder(null)).toHaveLength(4);          // no trump -> stable default
  });

  // The sorted hand starts with the trump suit cards.
  it('displaySort groups trump cards at the front', () => {
    const hand: Card[] = [
      { rank: 'A', suit: 'trefle' }, { rank: '9', suit: 'pique' },
      { rank: 'V', suit: 'pique' }, { rank: 'R', suit: 'coeur' },
    ];
    const sorted = displaySort(hand, 'pique');
    expect(sorted[0].suit).toBe('pique'); // a trump card leads
    expect(sorted).toHaveLength(4);        // no card lost
  });
});
