/* =============================================================================
 * MATCHES · matchFormatConfig.service.ts — Règles EFFECTIVES d'un match (v16).
 * -----------------------------------------------------------------------------
 * Fusionne les règles structurelles du catalogue (effectif, headless…) avec la
 * config éditable persistée (mise, gain, manches, score cible). Auto-seed des
 * valeurs par défaut depuis le catalogue au premier accès (idempotent).
 * ========================================================================== */
import { MatchFormat, MATCH_FORMAT_CATALOG, getMatchFormatRules, effectiveHouseRake, type MatchFormatRules } from './matchFormat.js';
import { MatchFormatConfigModel } from './matchFormatConfig.model.js';

/** Habillage par défaut par format (repris du mobile pour cohérence visuelle). */
const DISPLAY_DEFAULTS: Record<MatchFormat, { color: string; icon: string; subtitle: string; order: number }> = {
  [MatchFormat.DUO_STEEL]: { color: '#3f6ea1', icon: '♦', subtitle: 'Un affrontement 100 % en coulisses.', order: 0 },
  [MatchFormat.HYBRID_ALLIANCE]: { color: '#c99c3f', icon: '♠', subtitle: 'Vous + votre robot, tous ensemble.', order: 1 },
  [MatchFormat.ROYAL_SQUARE]: { color: '#b0384a', icon: '♥', subtitle: 'Quatre humains, deux équipes, une couronne.', order: 2 },
};

export interface EffectiveMatchConfig {
  format: MatchFormat;
  label: string;
  subtitle: string;
  buyInPerPlayer: number;
  prizePerWinner: number;
  manches: 1 | 2 | 4;
  baseTarget: number;
  labelTarget: number;
  houseRake: number;                 // recalculé : collecté − payé
  color: string;
  icon: string;
  active: boolean;
  order: number;
  minLevel: number;
  maxLevel: number | null;
  // Champs structurels (non éditables) repris du catalogue.
  humansPerMatch: number;
  robotsPerPlayer: number;
  requiresSubstitute: boolean;
  winnersPerMatch: number;
  isHeadless: boolean;
}

/**
 * v16 — Prédicat PUR d'éligibilité par niveau : le joueur doit avoir un niveau
 * ≥ minLevel et ≤ maxLevel (maxLevel null = pas de plafond). Réutilisé par le
 * middleware d'inscription et le filtrage d'affichage.
 */
export function isLevelEligible(level: number, minLevel: number, maxLevel: number | null): boolean {
  return level >= (minLevel ?? 0) && (maxLevel == null || level <= maxLevel);
}

export class MatchFormatConfigService {
  /** Crée les documents manquants à partir du catalogue (idempotent). */
  async ensureSeeded(): Promise<void> {
    for (const format of Object.values(MatchFormat)) {
      const exists = await MatchFormatConfigModel.exists({ format });
      if (exists) continue;
      const rules = MATCH_FORMAT_CATALOG[format];
      const d = DISPLAY_DEFAULTS[format];
      await MatchFormatConfigModel.create({
        format,
        label: rules.label,
        subtitle: d.subtitle,
        buyInPerPlayer: rules.buyInPerPlayer,
        prizePerWinner: rules.prizePerWinner,
        manches: 2, baseTarget: 1500, labelTarget: 2000,
        color: d.color, icon: d.icon, active: true, order: d.order,
        minLevel: 0, maxLevel: null,
      });
    }
  }

  /** Config éditable brute d'un format (document persisté, seedé si absent). */
  async getRaw(format: MatchFormat): Promise<any> {
    await this.ensureSeeded();
    return MatchFormatConfigModel.findOne({ format }).lean();
  }

  /**
   * Liste des configs, triées par `order`.
   * - `activeOnly` : ne garde que les formats actifs.
   * - `userLevel`  : ne garde que ceux ÉLIGIBLES au niveau du joueur
   *   (minLevel ≤ level ≤ maxLevel|∞). Sert au filtrage d'affichage mobile.
   */
  async list(activeOnly = false, userLevel?: number): Promise<any[]> {
    await this.ensureSeeded();
    const filter: any = {};
    if (activeOnly) filter.active = true;
    if (typeof userLevel === 'number') {
      filter.minLevel = { $lte: userLevel };
      filter.$or = [{ maxLevel: null }, { maxLevel: { $gte: userLevel } }];
    }
    return MatchFormatConfigModel.find(filter).sort({ order: 1 }).lean();
  }

  /** Règles EFFECTIVES : structure du catalogue + économie/jeu de la config. */
  async getEffective(format: MatchFormat): Promise<EffectiveMatchConfig> {
    const structural: MatchFormatRules = getMatchFormatRules(format);
    const cfg: any = await this.getRaw(format);
    const buyInPerPlayer = cfg?.buyInPerPlayer ?? structural.buyInPerPlayer;
    const prizePerWinner = cfg?.prizePerWinner ?? structural.prizePerWinner;
    // Rake recalculé pour rester cohérent si mise/gain ont changé (part du rake
    // catalogue + delta), afin de préserver la sémantique métier par défaut.
    const houseRake = effectiveHouseRake(
      structural.houseRake,
      buyInPerPlayer, prizePerWinner,
      structural.buyInPerPlayer, structural.prizePerWinner,
      structural.humansPerMatch, structural.winnersPerMatch,
    );
    const d = DISPLAY_DEFAULTS[format];
    return {
      format,
      label: cfg?.label ?? structural.label,
      subtitle: cfg?.subtitle ?? d.subtitle,
      buyInPerPlayer,
      prizePerWinner,
      manches: ([1, 2, 4].includes(cfg?.manches) ? cfg.manches : 2) as 1 | 2 | 4,
      baseTarget: cfg?.baseTarget ?? 1500,
      labelTarget: cfg?.labelTarget ?? 2000,
      houseRake,
      color: cfg?.color ?? d.color,
      icon: cfg?.icon ?? d.icon,
      active: cfg?.active ?? true,
      order: cfg?.order ?? d.order,
      minLevel: cfg?.minLevel ?? 0,
      maxLevel: cfg?.maxLevel ?? null,
      humansPerMatch: structural.humansPerMatch,
      robotsPerPlayer: structural.robotsPerPlayer,
      requiresSubstitute: structural.requiresSubstitute,
      winnersPerMatch: structural.winnersPerMatch,
      isHeadless: structural.isHeadless,
    };
  }
}

export const matchFormatConfigService = new MatchFormatConfigService();
