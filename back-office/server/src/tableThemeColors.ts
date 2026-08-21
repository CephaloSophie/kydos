/* =============================================================================
 * TABLE-THEME · tableTheme.colors.ts — Résolution PURE d'un thème → couleurs.
 * -----------------------------------------------------------------------------
 * Un thème de table est défini par l'admin avec quelques couleurs « métier » :
 *   • feltColor      — couleur centrale du tapis (feutre).
 *   • feltEdgeColor  — couleur des bords du tapis (dégradé radial). Optionnel :
 *                      par défaut un assombrissement de feltColor.
 *   • railColor      — couleur de la bordure (rail) de la table.
 *   • accentColor    — couleur d'accent (liseré/or). Optionnel.
 *
 * Ce module traduit ces couleurs en un JEU COMPLET de couleurs que le rendu
 * Pixi consomme (`felt1/felt2`, `rail/railHi/railLo/railInner`, `accent/
 * accent2`). Les nuances de rail (clair/foncé/intérieur) sont DÉRIVÉES par
 * éclaircissement / assombrissement, pour que l'admin n'ait qu'une couleur à
 * choisir.
 *
 * 100 % pur (aucune I/O) → testable seul. Les couleurs entrantes/sortantes sont
 * des chaînes hex « #rrggbb ».
 * ========================================================================== */

export interface ThemeColorInput {
  feltColor: string;
  feltEdgeColor?: string | null;
  railColor: string;
  accentColor?: string | null;
  /**
   * v18 — Dos des cartes (affiché sur la table). `cardBackColor` = haut du
   * dégradé, `cardBackColor2` = bas ; la rayure et la bordure en sont dérivées.
   * Optionnels : défaut indigo historique.
   */
  cardBackColor?: string | null;
  cardBackColor2?: string | null;
}

/** Jeu de couleurs résolu, consommé tel quel par le rendu Pixi (hex #rrggbb). */
export interface ResolvedThemeColors {
  felt1: string; felt2: string;
  rail: string; railHi: string; railLo: string; railInner: string;
  accent: string; accent2: string;
  /** v18 — dos des cartes : dégradé (haut/bas), rayure, bordure. */
  backHi: string; backLo: string;
}

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;

/** Normalise une couleur en « #rrggbb » minuscule ; `fallback` si invalide. */
export function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value === 'string' && HEX_RE.test(value.trim())) {
    const v = value.trim().toLowerCase();
    return v.startsWith('#') ? v : `#${v}`;
  }
  return fallback;
}

interface RGB { r: number; g: number; b: number }

function toRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function toHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Éclaircit (`amount > 0`) ou assombrit (`amount < 0`) une couleur.
 * `amount` ∈ [-1, 1] : -1 = noir, +1 = blanc.
 */
export function shade(hex: string, amount: number): string {
  const { r, g, b } = toRgb(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  return toHex({
    r: r + (t - r) * p,
    g: g + (t - g) * p,
    b: b + (t - b) * p,
  });
}

/**
 * Résout les couleurs complètes d'un thème à partir de ses couleurs « métier ».
 * - felt2 par défaut = feutre assombri de 45 %.
 * - railHi = rail +30 %, railLo = rail −45 %, railInner = rail −65 %.
 * - accent2 par défaut = accent éclairci de 30 %.
 */
export function resolveThemeColors(input: ThemeColorInput): ResolvedThemeColors {
  const felt1 = normalizeHex(input.feltColor, '#1a5c3a');
  const felt2 = normalizeHex(input.feltEdgeColor ?? null, shade(felt1, -0.45));
  const rail = normalizeHex(input.railColor, '#6b3a1a');
  const accent = normalizeHex(input.accentColor ?? null, '#f0c46a');
  // v18 — dos des cartes : défaut indigo historique ; bas dérivé du haut.
  const backHi = normalizeHex(input.cardBackColor ?? null, '#6b78ea');
  const backLo = normalizeHex(input.cardBackColor2 ?? null, shade(backHi, -0.55));
  return {
    felt1,
    felt2,
    rail,
    railHi: shade(rail, 0.3),
    railLo: shade(rail, -0.45),
    railInner: shade(rail, -0.65),
    accent,
    accent2: shade(accent, 0.3),
    backHi,
    backLo,
  };
}

/** Thèmes intégrés (non supprimables) — reflètent les presets historiques. */
export const BUILTIN_THEMES: Array<{ key: string; name: string; order: number } & ThemeColorInput> = [
  { key: 'classic', name: 'Classique (vert)', order: 0, feltColor: '#1a5c3a', feltEdgeColor: '#0f3f27', railColor: '#6b3a1a', accentColor: '#f0c46a' },
  { key: 'acier', name: 'Acier (bleu)', order: 1, feltColor: '#1b3a63', feltEdgeColor: '#0a1c34', railColor: '#2f3a4a', accentColor: '#a8c5e8' },
  { key: 'hybride', name: 'Hybride (or)', order: 2, feltColor: '#6b5518', feltEdgeColor: '#3a2c08', railColor: '#4a3618', accentColor: '#f0c46a' },
  { key: 'royal', name: 'Royale (bordeaux)', order: 3, feltColor: '#5c1c2b', feltEdgeColor: '#2a0812', railColor: '#2a1418', accentColor: '#e28aa4' },
  { key: 'cosmos', name: 'Cosmos (indigo)', order: 4, feltColor: '#2a2350', feltEdgeColor: '#120e2c', railColor: '#3a2f5a', accentColor: '#b7a6ff' },
  { key: 'olympus', name: 'Olympe (marbre)', order: 5, feltColor: '#3a4a4f', feltEdgeColor: '#1a2427', railColor: '#5a5040', accentColor: '#e6d8a8' },
];
