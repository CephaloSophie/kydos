/* =============================================================================
 * scene/trickPlacement.ts — Placement des cartes jouées (logique PURE, testable)
 * -----------------------------------------------------------------------------
 * OBJECTIF : les cartes jouées se superposent joliment SANS jamais cacher la
 * VALEUR (coin haut-gauche : rang + couleur) des cartes déjà posées.
 *
 * Principe : chaque carte est décalée du centre PRINCIPALEMENT vers le siège de
 * son joueur (la carte « vient » de ce joueur). Les quatre cartes occupent donc
 * quatre secteurs distincts autour du centre → leurs coins restent dégagés. Un
 * léger jitter déterministe donne un rendu naturel sans refermer les secteurs.
 * L'inclinaison reste perpendiculaire au joueur avec un petit écart (±14°) :
 * assez pour le réalisme, pas trop pour ne pas enfouir un coin.
 *
 * `rel` = siège relatif au spectateur (0 bas, 1 gauche, 2 haut, 3 droite).
 * ========================================================================== */

/** Hash déterministe d'une chaîne + sel → réel dans [0, 1[. */
export function hashUnit(seed: string, salt: number): number {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
  return ((h >>> 0) % 100000) / 100000;
}

/** Rotation de base (perpendiculaire au joueur) par siège relatif. */
export const BASE_ROTATION = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

/** Direction (unitaire) du secteur de chaque siège, depuis le centre. */
export const SEAT_DIRECTION: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0, y: 1 },   // rel 0 (bas)    → carte décalée vers le bas
  { x: -1, y: 0 },  // rel 1 (gauche) → vers la gauche
  { x: 0, y: -1 },  // rel 2 (haut)   → vers le haut
  { x: 1, y: 0 },   // rel 3 (droite) → vers la droite
];

export interface TrickPlacement { dx: number; dy: number; rot: number }

/**
 * Calcule le placement (offset depuis le centre + rotation) d'une carte.
 * @param key   identifiant stable de la carte (ex. "2:V pique")
 * @param rel   siège relatif au spectateur (0..3)
 * @param cardW largeur de carte (px)
 * @param cardH hauteur de carte (px)
 */
export function placeTrickCard(key: string, rel: number, cardW: number, cardH: number): TrickPlacement {
  const size = Math.max(cardW, cardH);
  const dir = SEAT_DIRECTION[rel] ?? SEAT_DIRECTION[0];

  // Décalage DIRECTIONNEL : la carte s'éloigne du centre vers son siège d'une
  // fraction franche de sa taille (≈ 34%), pour séparer nettement les quatre
  // cartes et laisser voir les coins (recouvrement central marqué mais pas
  // masquant).
  const along = size * 0.34;
  // Jitter perpendiculaire léger (≈ ±10% de la taille) pour casser l'alignement
  // parfait sans refermer le secteur voisin.
  const perp = (hashUnit(key, 2) * 2 - 1) * size * 0.1;
  const dx = dir.x * along - dir.y * perp;   // perp = rotation 90° de dir
  const dy = dir.y * along + dir.x * perp;

  const base = BASE_ROTATION[rel] ?? 0;
  const jitter = (hashUnit(key, 3) * 2 - 1) * (Math.PI / 13); // ±≈14°
  return { dx, dy, rot: base + jitter };
}
