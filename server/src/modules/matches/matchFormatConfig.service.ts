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
  id: string | null;               // _id de la variante (null si fallback catalogue)
  format: MatchFormat;
  label: string;
  subtitle: string;
  buyInPerPlayer: number;
  prizePerWinner: number;
  manches: 1 | 2 | 4;
  baseTarget: number;
  labelTarget: number;
  // v17 — règles de belote configurables.
  openingBidMin: number;
  countBelote: boolean;
  clockwise: boolean;
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

let legacyIndexChecked = false;

export class MatchFormatConfigService {
  /**
   * v16 — Supprime (une fois par process) l'ancien index UNIQUE `format_1` :
   * il empêchait plusieurs variantes d'un même format. Mongoose recrée ensuite
   * un index non-unique. Silencieux si l'index est absent (nouvelle base).
   */
  async #dropLegacyUniqueIndex(): Promise<void> {
    if (legacyIndexChecked) return;
    legacyIndexChecked = true;
    try {
      const indexes = await MatchFormatConfigModel.collection.indexes();
      const legacy = indexes.find((i: any) => i.name === 'format_1' && i.unique);
      if (legacy) await MatchFormatConfigModel.collection.dropIndex('format_1');
    } catch { /* index absent ou collection inexistante : rien à faire */ }
  }

  /**
   * Seed initial : crée UNE variante par défaut par format SI la collection est
   * vide (idempotent). Avec le multi-variantes (v16), on ne re-seed pas format
   * par format — sinon on recréerait des doublons à chaque appel.
   */
  async ensureSeeded(): Promise<void> {
    await this.#dropLegacyUniqueIndex();
    const count = await MatchFormatConfigModel.estimatedDocumentCount();
    if (count > 0) return;
    for (const format of Object.values(MatchFormat)) {
      const rules = MATCH_FORMAT_CATALOG[format];
      const d = DISPLAY_DEFAULTS[format];
      await MatchFormatConfigModel.create({
        format,
        label: rules.label,
        subtitle: d.subtitle,
        buyInPerPlayer: rules.buyInPerPlayer,
        prizePerWinner: rules.prizePerWinner,
        manches: 2, baseTarget: 1500, labelTarget: 2000,
        // v17 — règles de belote configurables (valeurs standard par défaut).
        openingBidMin: 90, countBelote: true, clockwise: false,
        color: d.color, icon: d.icon, active: true, order: d.order,
        minLevel: 0, maxLevel: null,
      });
    }
  }

  /** Variante brute par _id. */
  async getById(variantId: string): Promise<any> {
    return MatchFormatConfigModel.findById(variantId).lean();
  }

  /** Config éditable brute — 1ʳᵉ variante d'un format (fallback/compat). */
  async getRaw(format: MatchFormat): Promise<any> {
    await this.ensureSeeded();
    return MatchFormatConfigModel.findOne({ format }).sort({ order: 1 }).lean();
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

  /** Construit les règles EFFECTIVES à partir d'une variante + son format. */
  buildEffective(format: MatchFormat, cfg: any): EffectiveMatchConfig {
    const structural: MatchFormatRules = getMatchFormatRules(format);
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
      id: cfg?._id ? String(cfg._id) : null,
      format,
      label: cfg?.label ?? structural.label,
      subtitle: cfg?.subtitle ?? d.subtitle,
      buyInPerPlayer,
      prizePerWinner,
      manches: ([1, 2, 4].includes(cfg?.manches) ? cfg.manches : 2) as 1 | 2 | 4,
      baseTarget: cfg?.baseTarget ?? 1500,
      labelTarget: cfg?.labelTarget ?? 2000,
      openingBidMin: cfg?.openingBidMin ?? 90,
      countBelote: cfg?.countBelote !== false,
      clockwise: cfg?.clockwise === true,
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

  /** Règles EFFECTIVES d'une VARIANTE précise (par _id). Lève si introuvable. */
  async getEffectiveById(variantId: string): Promise<EffectiveMatchConfig> {
    const cfg: any = await this.getById(variantId);
    if (!cfg) throw new Error(`Variante de match introuvable : ${variantId}`);
    return this.buildEffective(cfg.format as MatchFormat, cfg);
  }

  /** Règles EFFECTIVES — 1ʳᵉ variante d'un format (fallback/compat). */
  async getEffective(format: MatchFormat): Promise<EffectiveMatchConfig> {
    const cfg: any = await this.getRaw(format);
    return this.buildEffective(format, cfg);
  }
}

export const matchFormatConfigService = new MatchFormatConfigService();
