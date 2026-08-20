/* =============================================================================
 * TABLE-THEME · tableTheme.service.ts — Accès & résolution des thèmes.
 * -----------------------------------------------------------------------------
 * • ensureSeeded()      — crée les presets intégrés si la collection est vide.
 * • resolveColorsById() — thème (par _id) → jeu de couleurs concret pour le
 *                          rendu Pixi. Repli sur le 1ᵉʳ thème intégré si l'id
 *                          est absent/invalide (thème supprimé, etc.).
 * ========================================================================== */
import { TableThemeModel } from './tableTheme.model.js';
import { BUILTIN_THEMES, resolveThemeColors, type ResolvedThemeColors } from './tableTheme.colors.js';

export class TableThemeService {
  /** Crée les presets intégrés une fois (idempotent). */
  async ensureSeeded(): Promise<void> {
    const count = await TableThemeModel.estimatedDocumentCount();
    if (count > 0) return;
    await TableThemeModel.create(
      BUILTIN_THEMES.map((t) => ({
        name: t.name, key: t.key, builtIn: true,
        feltColor: t.feltColor, feltEdgeColor: t.feltEdgeColor ?? null,
        railColor: t.railColor, accentColor: t.accentColor ?? null,
        active: true, status: 'active', order: t.order,
      })),
    );
  }

  /** Couleurs par défaut (1ᵉʳ preset intégré) — utilisé en repli. */
  defaultColors(): ResolvedThemeColors {
    const b = BUILTIN_THEMES[0];
    return resolveThemeColors(b);
  }

  /**
   * Résout les couleurs d'un thème par son _id. Repli sur les couleurs par
   * défaut si l'id est vide, invalide ou introuvable (thème supprimé).
   */
  async resolveColorsById(themeId?: string | null): Promise<ResolvedThemeColors> {
    if (!themeId) return this.defaultColors();
    try {
      const doc: any = await TableThemeModel.findById(themeId).lean();
      if (!doc) return this.defaultColors();
      return resolveThemeColors({
        feltColor: doc.feltColor,
        feltEdgeColor: doc.feltEdgeColor,
        railColor: doc.railColor,
        accentColor: doc.accentColor,
      });
    } catch {
      return this.defaultColors();
    }
  }
}

export const tableThemeService = new TableThemeService();
