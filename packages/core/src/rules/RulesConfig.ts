// ============================================================================
//  RulesConfig — TOUTES les valeurs « en dur » du barème, isolées et
//  configurables. Pour une variante maison : cloner cet objet et l'injecter
//  dans `new ContreeRules(config)`. Rien d'autre à toucher.
// ============================================================================

export interface RulesConfig {
  /** Enchère minimale / maximale. */
  minBid: number; // 90
  maxBid: number; // 180
  /** Arrondi à la dizaine (>=5 vers le haut). */
  roundTo: number; // 10
  /** Prime de belote (Roi + Dame d'atout). */
  beloteBonus: number; // 20
  /** Dix de der (dernier pli). */
  dixDeDer: number; // 10
  /** Capot non déclaré / déclaré. */
  capotUndeclared: number; // 250
  capotDeclared: number; // 500
  /** Multiplicateurs de contre / surcontre (utilisés pour le capot uniquement). */
  contreMultiplier: number; // 2
  surcontreMultiplier: number; // 4
  /** Forfait FIXE marqué par le camp gagnant en cas de contre / surcontre. */
  contreWin: number; // 320
  surcontreWin: number; // 640
  /** Score FIXE de la défense quand le preneur chute (sans contre). */
  dedansBase: number; // 160
  /** Objectifs de manche : standard et label. */
  baseTarget: number; // 1500
  labelTarget: number; // 2000
}

export const DEFAULT_RULES_CONFIG: RulesConfig = {
  minBid: 90,
  maxBid: 180,
  roundTo: 10,
  beloteBonus: 20,
  dixDeDer: 10,
  capotUndeclared: 250,
  capotDeclared: 500,
  contreMultiplier: 2,
  surcontreMultiplier: 4,
  contreWin: 320,
  surcontreWin: 640,
  dedansBase: 160,
  baseTarget: 1500,
  labelTarget: 2000,
};
