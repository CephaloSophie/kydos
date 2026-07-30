// Pure tests for the table sound-event detector (view diffing).
import { describe, expect, it } from 'vitest';
import type { EngineView } from 'belote-core';
import { detectSoundEvents } from './soundEvents';

/** Minimal view factory — only the fields the detector reads. */
function view(partial: Partial<EngineView> = {}): EngineView {
  return {
    currentTrick: [], bids: [], awaitingCollect: false, belote: null,
    ...partial,
  } as unknown as EngineView;
}

describe('detectSoundEvents — cartes jouées', () => {
  it('MA carte → card-play ; carte d’un autre → card-other', () => {
    const prev = view();
    const mine = view({ currentTrick: [{ seat: 0, card: { rank: 'A', suit: 'coeur' } }] as EngineView['currentTrick'] });
    expect(detectSoundEvents(prev, mine, 0)).toEqual(['card-play']);
    expect(detectSoundEvents(prev, mine, 2)).toEqual(['card-other']);
  });

  it('spectateur (mySeat null) : toutes les cartes sonnent « autre »', () => {
    const prev = view();
    const next = view({ currentTrick: [{ seat: 1, card: { rank: '10', suit: 'pique' } }] as EngineView['currentTrick'] });
    expect(detectSoundEvents(prev, next, null)).toEqual(['card-other']);
  });

  it('plusieurs cartes arrivées d’un coup → un son par carte', () => {
    const prev = view({ currentTrick: [{ seat: 0, card: { rank: 'A', suit: 'coeur' } }] as EngineView['currentTrick'] });
    const next = view({ currentTrick: [
      { seat: 0, card: { rank: 'A', suit: 'coeur' } },
      { seat: 1, card: { rank: 'R', suit: 'coeur' } },
      { seat: 2, card: { rank: 'D', suit: 'coeur' } },
    ] as EngineView['currentTrick'] });
    expect(detectSoundEvents(prev, next, 0)).toEqual(['card-other', 'card-other']);
  });

  it('premier rendu (prev null) : silence — pas de rafale en rejoignant', () => {
    const next = view({ currentTrick: [{ seat: 3, card: { rank: 'V', suit: 'trefle' } }] as EngineView['currentTrick'] });
    expect(detectSoundEvents(null, next, 0)).toEqual([]);
  });
});

describe('detectSoundEvents — enchères', () => {
  const bid = (action: string, extra: Record<string, unknown> = {}) =>
    ({ seat: 1, action, ...extra }) as EngineView['bids'][number];

  it('pass / contré / surcontré → leurs sons', () => {
    expect(detectSoundEvents(view(), view({ bids: [bid('pass')] }), 0)).toEqual(['pass']);
    expect(detectSoundEvents(view(), view({ bids: [bid('contree')] }), 0)).toEqual(['contre']);
    expect(detectSoundEvents(view(), view({ bids: [bid('surcontree')] }), 0)).toEqual(['surcontre']);
  });

  it('hausse simple → bid-raise ; hausse avec réflexion → bid-reflexion', () => {
    expect(detectSoundEvents(view(), view({ bids: [bid('bid', { value: 90 })] }), 0)).toEqual(['bid-raise']);
    expect(detectSoundEvents(view(), view({ bids: [bid('bid', { value: 100, reflexion: true })] }), 0)).toEqual(['bid-reflexion']);
    expect(detectSoundEvents(view(), view({ bids: [bid('capot')] }), 0)).toEqual(['bid-raise']);
  });

  it('nouvelle donne : la liste repart à 1 annonce → son quand même joué', () => {
    const prev = view({ bids: [bid('bid', { value: 90 }), bid('pass'), bid('pass'), bid('pass')] });
    const next = view({ bids: [bid('bid', { value: 110 })] });
    expect(detectSoundEvents(prev, next, 0)).toEqual(['bid-raise']);
  });
});

describe('detectSoundEvents — pli et belote', () => {
  it('ramassage : pli plein qui se vide → trick-collect', () => {
    const prev = view({ awaitingCollect: true, currentTrick: [
      { seat: 0, card: { rank: 'A', suit: 'coeur' } }, { seat: 1, card: { rank: 'R', suit: 'coeur' } },
      { seat: 2, card: { rank: 'D', suit: 'coeur' } }, { seat: 3, card: { rank: 'V', suit: 'coeur' } },
    ] as EngineView['currentTrick'] });
    const next = view({ awaitingCollect: false, currentTrick: [] });
    expect(detectSoundEvents(prev, next, 0)).toEqual(['trick-collect']);
  });

  it('belote annoncée : 1re carte de la paire → belote (et pas de doublon sans progression)', () => {
    const prev = view({ belote: { seat: 0, announcing: true, playedCount: 0 } });
    const first = view({ belote: { seat: 0, announcing: true, playedCount: 1 } });
    expect(detectSoundEvents(prev, first, 0)).toEqual(['belote']);
    expect(detectSoundEvents(first, first, 0)).toEqual([]);
    const second = view({ belote: { seat: 0, announcing: true, playedCount: 2 } });
    expect(detectSoundEvents(first, second, 0)).toEqual(['belote']); // rebelote
  });

  it('belote NON annoncée (announcing=false) : silence', () => {
    const prev = view({ belote: { seat: 0, announcing: false, playedCount: 0 } });
    const next = view({ belote: { seat: 0, announcing: false, playedCount: 1 } });
    expect(detectSoundEvents(prev, next, 0)).toEqual([]);
  });
});
