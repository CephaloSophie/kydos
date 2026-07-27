/** Shared geometry types for the scene layers. */
export type Rect = { x: number; y: number; w: number; h: number; r: number };
export type Dir = 'south' | 'west' | 'north' | 'east';
export const DIR_BY_REL: Dir[] = ['south', 'west', 'north', 'east'];


/**
 * Distance d'ancrage d'une main à l'intérieur du feutre, PROPORTIONNELLE à la
 * hauteur de carte. Utilisée à la fois par HandsLayer (position des éventails)
 * et par TrickLayer (origine des cartes qui glissent depuis la main) — les deux
 * DOIVENT partager la même valeur pour que les trajectoires soient cohérentes.
 */
export function handInset(cardH: number): number {
  // Ancrage proche du bord : le sud descend vers le bas, le nord monte vers le
  // haut. Valeur volontairement faible (≈ un tiers de carte) pour coller aux
  // bords sans que les cartes ne sortent du feutre.
  return Math.round(cardH * 0.30 + 8);
}
