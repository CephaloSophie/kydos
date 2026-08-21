// ============================================================================
//  tableConfig — Résolution d'une CONFIGURATION DE TABLE en objets moteur.
// ----------------------------------------------------------------------------
//  Une table de belote est instanciée à partir d'un jeu d'options « métier »
//  (choisies par le back-office, un tournoi ou le lobby). Ce module TRADUIT
//  ces options en les deux objets que le moteur consomme réellement :
//
//    • `RulesConfig`  — barème (enchère minimale d'ouverture, prime de belote
//                       comptée ou non, objectifs de manche…).
//    • `PartieConfig` — orchestration (manches, sens du jeu, timers, signaux).
//
//  C'est le POINT UNIQUE où « belote comptée ou non », « score initial des
//  enchères » et « sens du jeu » deviennent effectifs. Aucun runner ne doit
//  plus fabriquer ces objets à la main : tous appellent `resolveTableConfig`.
//
//  Fonctions PURES (aucune I/O) → testables isolément.
// ============================================================================

import { DEFAULT_RULES_CONFIG, type RulesConfig } from '../rules/RulesConfig';
import { DEFAULT_PARTIE, type PartieConfig } from './types';

/** Prime de belote standard (Roi + Dame d'atout annoncés). */
export const BELOTE_BONUS = 20;

/**
 * Options « métier » d'une table. Tout est OPTIONNEL : chaque champ absent
 * retombe sur la valeur par défaut du moteur. C'est le contrat stable que le
 * serveur, les tournois et le lobby remplissent.
 */
export interface TableConfigOptions {
  /** 1, 2 ou 4 manches. */
  manches?: number;
  /** Objectif d'une manche standard (défaut 1500). */
  baseTarget?: number;
  /** Objectif du grand label (défaut 2000). */
  labelTarget?: number;
  /**
   * Score initial pour COMMENCER les enchères (enchère minimale d'ouverture).
   * Défaut 90. Doit rester un multiple de l'arrondi (10).
   */
  openingBidMin?: number;
  /**
   * La belote (Roi + Dame d'atout) est-elle COMPTÉE dans le score ?
   * Défaut `true`. Si `false`, la belote peut toujours être annoncée mais
   * ne rapporte AUCUN point (prime ramenée à 0).
   */
  countBelote?: boolean;
  /**
   * Sens du jeu : `false` = antihoraire (défaut belote), `true` = horaire.
   */
  clockwise?: boolean;
  /** Partie locale d'entraînement (pas de gains, cartes visibles). */
  local?: boolean;
  responseTimeMs?: number;
  maxPlayTimeMs?: number;
  /** Signaux d'enchère autorisés à cette table. */
  signals?: { reflexion?: boolean; repeatSuit?: boolean };
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const asManches = (v: unknown): 1 | 2 | 4 => ([1, 2, 4].includes(Number(v)) ? Number(v) : DEFAULT_PARTIE.manches) as 1 | 2 | 4;

/**
 * Traduit les options de table en `RulesConfig` (barème). Applique
 * `openingBidMin` (→ minBid), `countBelote` (→ beloteBonus 20 ou 0) et les
 * objectifs de manche. Tout le reste hérite de `DEFAULT_RULES_CONFIG`.
 */
export function resolveRulesConfig(opts: TableConfigOptions = {}): RulesConfig {
  return {
    ...DEFAULT_RULES_CONFIG,
    minBid: isFiniteNum(opts.openingBidMin) ? opts.openingBidMin : DEFAULT_RULES_CONFIG.minBid,
    beloteBonus: opts.countBelote === false ? 0 : BELOTE_BONUS,
    baseTarget: isFiniteNum(opts.baseTarget) && opts.baseTarget > 0 ? opts.baseTarget : DEFAULT_RULES_CONFIG.baseTarget,
    labelTarget: isFiniteNum(opts.labelTarget) && opts.labelTarget > 0 ? opts.labelTarget : DEFAULT_RULES_CONFIG.labelTarget,
  };
}

/**
 * Traduit les options de table en `PartieConfig` (orchestration). Applique
 * `clockwise` (sens du jeu), les objectifs de manche, les timers et les
 * signaux. `baseTarget`/`labelTarget` restent COHÉRENTS avec la RulesConfig.
 */
export function resolvePartieConfig(opts: TableConfigOptions = {}): PartieConfig {
  return {
    ...DEFAULT_PARTIE,
    manches: asManches(opts.manches),
    baseTarget: isFiniteNum(opts.baseTarget) && opts.baseTarget > 0 ? opts.baseTarget : DEFAULT_PARTIE.baseTarget,
    labelTarget: isFiniteNum(opts.labelTarget) && opts.labelTarget > 0 ? opts.labelTarget : DEFAULT_PARTIE.labelTarget,
    responseTimeMs: isFiniteNum(opts.responseTimeMs) ? opts.responseTimeMs : DEFAULT_PARTIE.responseTimeMs,
    maxPlayTimeMs: isFiniteNum(opts.maxPlayTimeMs) ? opts.maxPlayTimeMs : DEFAULT_PARTIE.maxPlayTimeMs,
    clockwise: opts.clockwise === true,
    local: opts.local === true,
    signals: {
      reflexion: opts.signals?.reflexion !== false,
      repeatSuit: opts.signals?.repeatSuit !== false,
    },
  };
}

export interface ResolvedTableConfig {
  rulesConfig: RulesConfig;
  partieConfig: PartieConfig;
}

/**
 * Résout EN UNE FOIS les deux objets moteur d'une table. Point d'entrée
 * recommandé pour tout runner : `const { rulesConfig, partieConfig } =
 * resolveTableConfig(opts); new GameEngine(players, partieConfig, new
 * ContreeRules(rulesConfig));`
 */
export function resolveTableConfig(opts: TableConfigOptions = {}): ResolvedTableConfig {
  return { rulesConfig: resolveRulesConfig(opts), partieConfig: resolvePartieConfig(opts) };
}
