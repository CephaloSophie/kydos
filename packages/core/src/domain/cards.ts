// ============================================================================
//  Modèle de domaine — cartes, couleurs, rangs, valeurs, force
//  Module pur, partageable front + back (aucune dépendance).
// ============================================================================

export type Suit = 'pique' | 'coeur' | 'carreau' | 'trefle';
export type Rank = '7' | '8' | '9' | '10' | 'V' | 'D' | 'R' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: readonly Suit[] = ['pique', 'coeur', 'carreau', 'trefle'];
export const RANKS: readonly Rank[] = ['7', '8', '9', '10', 'V', 'D', 'R', 'A'];

export const SUIT_SYMBOL: Record<Suit, string> = {
  pique: '\u2660',
  coeur: '\u2665',
  carreau: '\u2666',
  trefle: '\u2663',
};

// Valeurs des cartes (points)
const TRUMP_VALUE: Record<Rank, number> = {
  V: 20, '9': 14, A: 11, '10': 10, R: 4, D: 3, '8': 0, '7': 0,
};
const PLAIN_VALUE: Record<Rank, number> = {
  A: 11, '10': 10, R: 4, D: 3, V: 2, '9': 0, '8': 0, '7': 0,
};

// Force (du plus faible au plus fort) — pour départager les plis
const TRUMP_ORDER: Rank[] = ['7', '8', 'D', 'R', '10', 'A', '9', 'V'];
const PLAIN_ORDER: Rank[] = ['7', '8', '9', 'V', 'D', 'R', '10', 'A'];

export function cardValue(card: Card, trump: Suit): number {
  return card.suit === trump ? TRUMP_VALUE[card.rank] : PLAIN_VALUE[card.rank];
}

export function cardStrength(card: Card, trump: Suit): number {
  const order = card.suit === trump ? TRUMP_ORDER : PLAIN_ORDER;
  return order.indexOf(card.rank);
}

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}

export function cardId(c: Card): string {
  return `${c.rank}${SUIT_SYMBOL[c.suit]}`;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function handContains(hand: Card[], rank: Rank, suit: Suit): boolean {
  return hand.some((c) => c.rank === rank && c.suit === suit);
}

export function cardsOfSuit(hand: Card[], suit: Suit): Card[] {
  return hand.filter((c) => c.suit === suit);
}

// Tri d'affichage d'une main : atout en premier ; puis les autres couleurs
// classées par leur plus haute carte (puis par nombre, sinon ordre stable) ;
// dans chaque couleur, la carte la plus forte d'abord. (Purement visuel.)
export function sortHand(hand: Card[], trump: Suit | null): Card[] {
  const sentinel = (trump ?? '__none__') as Suit;
  const strength = (c: Card) => cardStrength(c, sentinel);
  const groups = new Map<Suit, Card[]>();
  for (const c of hand) {
    const g = groups.get(c.suit) ?? [];
    g.push(c);
    groups.set(c.suit, g);
  }
  for (const g of groups.values()) g.sort((a, b) => strength(b) - strength(a));
  const suits = [...groups.keys()];
  suits.sort((a, b) => {
    if (trump) {
      if (a === trump) return -1;
      if (b === trump) return 1;
    }
    const maxA = Math.max(...groups.get(a)!.map(strength));
    const maxB = Math.max(...groups.get(b)!.map(strength));
    if (maxB !== maxA) return maxB - maxA;
    const nA = groups.get(a)!.length;
    const nB = groups.get(b)!.length;
    if (nB !== nA) return nB - nA;
    return SUITS.indexOf(a) - SUITS.indexOf(b);
  });
  return suits.flatMap((s) => groups.get(s)!);
}
