import { cardStrength, type Card, type Suit } from 'belote-core';

const RED = new Set<Suit>(['coeur', 'carreau']);

/**
 * Suit display order: trump first, then alternating colors (mirrors the DOM PlayerHand).
 * Black trump -> [trump, red, black, red]; red trump -> [trump, black, red, black].
 */
export function suitOrder(trump: Suit | null): Suit[] {
  if (!trump) return ['pique', 'coeur', 'trefle', 'carreau'];
  const reds = (['coeur', 'carreau'] as Suit[]).filter((s) => s !== trump);
  const blacks = (['pique', 'trefle'] as Suit[]).filter((s) => s !== trump);
  const rest = RED.has(trump) ? [blacks[0], reds[0], blacks[1]] : [reds[0], blacks[0], reds[1]];
  return [trump, ...rest];
}

/** Sort a hand for display: trump first (strong->weak within a suit), then alternating colors. */
export function displaySort(cards: Card[], trump: Suit | null): Card[] {
  const groups = new Map<Suit, Card[]>();
  for (const c of cards) { const g = groups.get(c.suit) ?? []; g.push(c); groups.set(c.suit, g); }
  for (const [suit, g] of groups) g.sort((a, b) => cardStrength(b, trump ?? suit) - cardStrength(a, trump ?? suit));
  return suitOrder(trump).flatMap((s) => groups.get(s) ?? []);
}
