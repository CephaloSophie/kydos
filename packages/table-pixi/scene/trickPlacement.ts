/* =============================================================================
 * scene/trickPlacement.ts — Placement des cartes jouées (logique PURE, testable)
 * -----------------------------------------------------------------------------
 * Chaque carte jouée est jetée vers le CENTRE de la table avec :
 *   • un décalage aléatoire borné : le centre de la carte reste à ≤ 40% de sa
 *     taille du centre de la table ;
 *   • une inclinaison PERPENDICULAIRE au joueur ±30° — c.-à-d. la carte "pointe"
 *     vers le siège de son joueur (base), à laquelle on ajoute un écart aléatoire
 *     dans [-30°, +30°] (soit 60°..120° par rapport au joueur).
 * Le tirage est déterministe (hash de la clé de carte) pour rester STABLE d'un
 * rendu à l'autre. `rel` = siège relatif au spectateur (0 bas, 1 gauche, 2 haut,
 * 3 droite).
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

export interface TrickPlacement { dx: number; dy: number; rot: number }

/**
 * Calcule le placement (offset depuis le centre + rotation) d'une carte.
 * @param key  identifiant stable de la carte (ex. "2:V pique")
 * @param rel  siège relatif au spectateur (0..3)
 * @param cardW largeur de carte (px)
 * @param cardH hauteur de carte (px)
 */
export function placeTrickCard(key: string, rel: number, cardW: number, cardH: number): TrickPlacement {
  const size = Math.max(cardW, cardH);
  const maxOff = size * 0.4;                       // ≤ 40% de la taille de carte
  const rx = hashUnit(key, 1) * 2 - 1;             // [-1, 1]
  const ry = hashUnit(key, 2) * 2 - 1;             // [-1, 1]
  const base = BASE_ROTATION[rel] ?? 0;
  const jitter = (hashUnit(key, 3) * 2 - 1) * (Math.PI / 6); // ±30° = ±π/6
  return { dx: rx * maxOff, dy: ry * maxOff, rot: base + jitter };
}
