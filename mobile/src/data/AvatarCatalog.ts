/* =============================================================================
 * DATA · AvatarCatalog.ts — Catalogue d'avatars servi par le back-office.
 * -----------------------------------------------------------------------------
 * v18 — Les avatars (mascotte + couleur d'accent, débloqués par niveau) ne sont
 * plus codés en dur dans le mobile : ils sont chargés depuis l'API et mis en
 * cache mémoire. Les lectures (`avatarAccent`, `getAvatarList`) sont SYNCHRONES
 * pour le rendu ; un repli minimal garantit un affichage même avant le 1ᵉʳ
 * chargement (résilience hors-ligne).
 * ========================================================================== */
import type { ApiClient } from './ApiClient';

export interface CatalogAvatar {
  key: string; name: string;
  accentColor: string;
  /** v18 — paramètres de design (dérivés de l'accent si absents). */
  bodyColor?: string | null;
  outlineColor?: string | null;
  /** v19 — traits paramétriques (antennes 1..5, état yeux/bouche). */
  antennas?: number; eyes?: string; mouth?: string;
  minLevel: number; maxLevel: number | null;
}

/**
 * Repli minimal si l'API n'a pas (encore) répondu — mêmes valeurs que les
 * presets historiques. La SOURCE DE VÉRITÉ reste le back-office (via l'API) ;
 * ceci n'est qu'un filet de sécurité hors-ligne.
 */
const FALLBACK: CatalogAvatar[] = [
  { key: 'atne', name: 'Atné', accentColor: '#7ecb98', minLevel: 0, maxLevel: null },
  { key: 'bato', name: 'Bâto', accentColor: '#e6c46a', minLevel: 0, maxLevel: null },
  { key: 'celi', name: 'Céli', accentColor: '#e85d70', minLevel: 0, maxLevel: null },
  { key: 'doxa', name: 'Doxa', accentColor: '#9db4dd', minLevel: 0, maxLevel: null },
  { key: 'eris', name: 'Éris', accentColor: '#b39ddb', minLevel: 0, maxLevel: null },
];

let cache: CatalogAvatar[] | null = null;

/** Charge (une fois) le catalogue depuis l'API. Silencieux en cas d'échec. */
export async function loadAvatarCatalog(api: ApiClient): Promise<void> {
  try {
    const { avatars } = await api.listAvatars();
    if (Array.isArray(avatars) && avatars.length) cache = avatars;
  } catch { /* on garde le repli */ }
}

/** Liste courante (catalogue chargé, sinon repli). */
export function getAvatarList(): CatalogAvatar[] {
  return cache ?? FALLBACK;
}

/** Avatar par clé (repli sur le 1ᵉʳ). */
export function avatarByKey(key: string | null | undefined): CatalogAvatar {
  const list = getAvatarList();
  return list.find((a) => a.key === key) ?? list[0];
}

/** Couleur d'accent d'un avatar par sa clé (repli sur le 1ᵉʳ avatar). */
export function avatarAccent(key: string | null | undefined): string {
  return avatarByKey(key).accentColor;
}

/** Face (couleurs + traits) d'un avatar robot, pour la mascotte SVG paramétrique. */
export function avatarFace(key: string | null | undefined): { kind: 'robot'; accentColor: string; bodyColor?: string | null; outlineColor?: string | null; antennas?: number; eyes?: any; mouth?: any } {
  const a = avatarByKey(key);
  return { kind: 'robot', accentColor: a.accentColor, bodyColor: a.bodyColor ?? null, outlineColor: a.outlineColor ?? null, antennas: a.antennas, eyes: a.eyes, mouth: a.mouth };
}
