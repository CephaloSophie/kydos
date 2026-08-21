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
}

export const robotAvatarService = new RobotAvatarService();
