/* =============================================================================
 * DATA · PlayerAvatarCatalog.ts — Catalogue de LOGOS joueurs (back-office).
 * -----------------------------------------------------------------------------
 * v19 — Logos proposés au joueur pour son profil : même mascotte paramétrique
 * que les robots, mais collection humaine (choix libre, aucun niveau). Chargés
 * depuis l'API, mis en cache mémoire ; lectures SYNCHRONES pour le rendu, avec
 * un repli minimal hors-ligne. La source de vérité reste le back-office.
 * ========================================================================== */
import type { ApiClient } from './ApiClient';

export interface PlayerLogo { key: string; name: string; accentColor: string; bodyColor?: string | null; outlineColor?: string | null; antennas?: number; eyes?: string; mouth?: string }

/** Repli minimal (mêmes logos intégrés que le serveur). */
const FALLBACK: PlayerLogo[] = [
  { key: 'saphir', name: 'Saphir', accentColor: '#4f8ce0' },
  { key: 'ambre', name: 'Ambre', accentColor: '#e0a63f' },
  { key: 'rubis', name: 'Rubis', accentColor: '#e0556b' },
  { key: 'jade', name: 'Jade', accentColor: '#3fae86' },
  { key: 'amethyste', name: 'Améthyste', accentColor: '#a074d8' },
  { key: 'onyx', name: 'Onyx', accentColor: '#8a95a6' },
];

let cache: PlayerLogo[] | null = null;

/** Charge (une fois) le catalogue depuis l'API. Silencieux en cas d'échec. */
export async function loadPlayerAvatarCatalog(api: ApiClient): Promise<void> {
  try {
    const { avatars } = await api.listPlayerAvatars();
    if (Array.isArray(avatars) && avatars.length) cache = avatars;
  } catch { /* on garde le repli */ }
}

/** Liste courante (catalogue chargé, sinon repli). */
export function getPlayerLogoList(): PlayerLogo[] {
  return cache ?? FALLBACK;
}

/** Logo par clé (repli sur le 1ᵉʳ). */
export function playerLogoByKey(key: string | null | undefined): PlayerLogo {
  const list = getPlayerLogoList();
  return list.find((a) => a.key === key) ?? list[0];
}

/** Face (couleurs + traits) d'un avatar joueur pour la mascotte SVG (famille humaine). */
export function playerFace(key: string | null | undefined): { kind: 'human'; accentColor: string; bodyColor?: string | null; outlineColor?: string | null; antennas?: number; eyes?: any; mouth?: any } {
  const a = playerLogoByKey(key);
  return { kind: 'human', accentColor: a.accentColor, bodyColor: a.bodyColor ?? null, outlineColor: a.outlineColor ?? null, antennas: a.antennas, eyes: a.eyes, mouth: a.mouth };
}
