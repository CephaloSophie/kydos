/* =============================================================================
 * PLAYER-AVATAR · playerAvatar.service.ts — Catalogue de logos joueurs.
 * ========================================================================== */
import { PlayerAvatarModel } from './playerAvatar.model.js';

/** Logos intégrés par défaut (teintes de la mascotte, choix libre du joueur). */
export const BUILTIN_PLAYER_AVATARS = [
  { key: 'saphir', name: 'Saphir', accentColor: '#4f8ce0', order: 0 },
  { key: 'ambre', name: 'Ambre', accentColor: '#e0a63f', order: 1 },
  { key: 'rubis', name: 'Rubis', accentColor: '#e0556b', order: 2 },
  { key: 'jade', name: 'Jade', accentColor: '#3fae86', order: 3 },
  { key: 'amethyste', name: 'Améthyste', accentColor: '#a074d8', order: 4 },
  { key: 'onyx', name: 'Onyx', accentColor: '#8a95a6', order: 5 },
];

export interface PlayerFace { accentColor: string; bodyColor: string | null; outlineColor: string | null }

export class PlayerAvatarService {
  /** Crée les logos intégrés si la collection est vide (idempotent). */
  async ensureSeeded(): Promise<void> {
    const count = await PlayerAvatarModel.estimatedDocumentCount();
    if (count > 0) return;
    await PlayerAvatarModel.create(
      BUILTIN_PLAYER_AVATARS.map((a) => ({ ...a, builtIn: true, active: true, status: 'active' })),
    );
  }

  /** Logos ACTIFS proposés à l'app (triés par `order`). */
  async listActive(): Promise<Array<{ key: string; name: string; accentColor: string; bodyColor: string | null; outlineColor: string | null; antennas: number; eyes: string; mouth: string }>> {
    await this.ensureSeeded();
    const docs: any[] = await PlayerAvatarModel.find({ active: true }).sort({ order: 1 }).lean();
    return docs.map((d) => ({
      key: d.key, name: d.name,
      accentColor: d.accentColor, bodyColor: d.bodyColor ?? null, outlineColor: d.outlineColor ?? null,
      antennas: d.antennas ?? 1, eyes: d.eyes ?? 'open', mouth: d.mouth ?? 'smile',
    }));
  }

  /** Une clé de logo est-elle valide (active) ? Sert à valider `User.avatarId`. */
  async isValidKey(key: string): Promise<boolean> {
    if (!key) return false;
    if (BUILTIN_PLAYER_AVATARS.some((a) => a.key === key)) return true;
    return !!(await PlayerAvatarModel.exists({ key, active: true }));
  }
}

export const playerAvatarService = new PlayerAvatarService();
