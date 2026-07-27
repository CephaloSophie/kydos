import { describe, it, expect } from 'vitest';
import { displaySort } from './PlayerHand';
import type { Card, Suit } from 'belote-core';

const c = (rank: string, suit: Suit): Card => ({ rank, suit }) as any;

describe('displaySort — tri d affichage de la main', () => {
  it('atout en premier (du plus fort au plus faible)', () => {
    const hand = [c('7', 'pique'), c('V', 'pique'), c('9', 'pique'), c('A', 'pique')];
    const sorted = displaySort(hand, 'pique').map((x) => x.rank);
    expect(sorted[0]).toBe('V'); // valet d atout = plus fort
    expect(sorted[1]).toBe('9'); // 9 d atout = 2e
  });
  it('couleurs alternées après l atout (atout noir -> rouge/noir/rouge)', () => {
    const hand = [c('A', 'pique'), c('A', 'trefle'), c('A', 'coeur'), c('A', 'carreau')];
    const suits = displaySort(hand, 'pique').map((x) => x.suit);
    expect(suits[0]).toBe('pique'); // atout
    // les 3 suivantes alternent les couleurs (pas deux noires ni deux rouges d affilée)
    const red = (s: Suit) => s === 'coeur' || s === 'carreau';
    expect(red(suits[1]) === red(suits[2])).toBe(false);
    expect(red(suits[2]) === red(suits[3])).toBe(false);
  });
  it('sans atout : ordre par défaut pique/coeur/trefle/carreau', () => {
    const hand = [c('A', 'carreau'), c('A', 'pique'), c('A', 'trefle'), c('A', 'coeur')];
    expect(displaySort(hand, null).map((x) => x.suit)).toEqual(['pique', 'coeur', 'trefle', 'carreau']);
  });
});
