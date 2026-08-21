/* =============================================================================
 * ROBOT-AVATAR · robotAvatar.service.ts — Accès au catalogue d'avatars.
 * ========================================================================== */
import { RobotAvatarModel } from './robotAvatar.model.js';

/** Presets intégrés = anciens AVATAR_PRESETS du mobile (désormais en base). */
export const BUILTIN_AVATARS = [
  { key: 'atne', name: 'Atné', accentColor: '#7ecb98', minLevel: 0, order: 0 },
  { key: 'bato', name: 'Bâto', accentColor: '#e6c46a', minLevel: 0, order: 1 },
  { key: 'celi', name: 'Céli', accentColor: '#e85d70', minLevel: 0, order: 2 },
  { key: 'doxa', name: 'Doxa', accentColor: '#9db4dd', minLevel: 0, order: 3 },
  { key: 'eris', name: 'Éris', accentColor: '#b39ddb', minLevel: 0, order: 4 },
];

/** Un avatar est-il proposable au niveau `level` ? (plage [min, max], max null = ∞). */
export function isAvatarUnlocked(level: number, minLevel: number, maxLevel: number | null): boolean {
  return level >= (minLevel ?? 0) && (maxLevel == null || level <= maxLevel);
}

export class RobotAvatarService {
  /** Crée les presets intégrés si la collection est vide (idempotent). */
  async ensureSeeded(): Promise<void> {
    const count = await RobotAvatarModel.estimatedDocumentCount();
    if (count > 0) return;
    await RobotAvatarModel.create(
      BUILTIN_AVATARS.map((a) => ({ ...a, maxLevel: null, builtIn: true, active: true, status: 'active' })),
    );
  }

  /**
   * Catalogue servi au mobile : avatars ACTIFS, filtrés par le niveau joueur
   * (si fourni). Trié par `order`.
   */
  async listForPlayer(userLevel?: number): Promise<Array<{ key: string; name: string; accentColor: string; bodyColor: string | null; outlineColor: string | null; minLevel: number; maxLevel: number | null }>> {
    await this.ensureSeeded();
    const docs: any[] = await RobotAvatarModel.find({ active: true }).sort({ order: 1 }).lean();
    const filtered = typeof userLevel === 'number'
      ? docs.filter((d) => isAvatarUnlocked(userLevel, d.minLevel ?? 0, d.maxLevel ?? null))
      : docs;
    return filtered.map((d) => ({
      key: d.key, name: d.name,
      accentColor: d.accentColor, bodyColor: d.bodyColor ?? null, outlineColor: d.outlineColor ?? null,
      minLevel: d.minLevel ?? 0, maxLevel: d.maxLevel ?? null,
    }));
  }

  /**
   * Résout les « faces » (couleurs accent/corps/contour) d'un lot de clés
   * d'avatar — pour teinter la mascotte robot servie comme logo de siège dans
   * la table Pixi. Repli sur les presets intégrés si la clé n'est pas en base.
   */
  async resolveFaces(keys: string[]): Promise<Map<string, RobotFace>> {
    const wanted = [...new Set(keys.filter(Boolean))];
    if (!wanted.length) return new Map();
    await this.ensureSeeded();
    const docs: any[] = await RobotAvatarModel.find({ key: { $in: wanted } }).lean();
    return mergeFaces(wanted, docs);
  }
}

export interface RobotFace { accentColor: string; bodyColor: string | null; outlineColor: string | null }

/**
 * PUR (testable) : associe chaque clé demandée à une face, en priorité depuis
 * les documents en base, sinon depuis les presets intégrés. Les clés vides sont
 * ignorées, les doublons dédoublonnés, les clés totalement inconnues absentes.
 */
export function mergeFaces(keys: string[], docs: Array<{ key: string; accentColor: string; bodyColor?: string | null; outlineColor?: string | null }>): Map<string, RobotFace> {
  const wanted = [...new Set(keys.filter(Boolean))];
  const byKey = new Map(docs.map((d) => [d.key, d]));
  const out = new Map<string, RobotFace>();
  for (const key of wanted) {
    const d = byKey.get(key);
    if (d) { out.set(key, { accentColor: d.accentColor, bodyColor: d.bodyColor ?? null, outlineColor: d.outlineColor ?? null }); continue; }
    const preset = BUILTIN_AVATARS.find((a) => a.key === key);
    if (preset) out.set(key, { accentColor: preset.accentColor, bodyColor: null, outlineColor: null });
  }
  return out;
}

export const robotAvatarService = new RobotAvatarService();
