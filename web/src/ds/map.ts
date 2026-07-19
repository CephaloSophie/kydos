import type { Card, Seat, Suit } from 'belote-core';

export type DsSuit = 'hearts' | 'diamonds' | 'spades' | 'clubs';
const FR2EN: Record<Suit, DsSuit> = { coeur: 'hearts', carreau: 'diamonds', pique: 'spades', trefle: 'clubs' };
export const toDsSuit = (s: Suit): DsSuit => FR2EN[s];

export interface DsCard { rank: string; suit: DsSuit; winning?: boolean }
export const toDsCard = (c: Card, winning = false): DsCard => ({ rank: c.rank, suit: toDsSuit(c.suit), winning });

export type Dir = 'south' | 'west' | 'north' | 'east';
const ORDER: Dir[] = ['south', 'west', 'north', 'east'];

/** Direction d'un siège, l'observateur/joueur (mySeat) toujours au sud. */
export function seatDir(seat: Seat, mySeat: Seat | null): Dir {
  const base = mySeat ?? 0;
  return ORDER[(((seat - base) % 4) + 4) % 4];
}

/** Position d'une main face visible (révélée) autour du tapis, par direction. */
export const REVEAL_POS: Record<Exclude<Dir, 'south'>, React.CSSProperties> = {
  north: { top: '17%', left: '50%', transform: 'translateX(-50%)' },
  west: { left: '11%', top: '50%', transform: 'translateY(-50%)' },
  east: { right: '11%', top: '50%', transform: 'translateY(-50%)' },
};
