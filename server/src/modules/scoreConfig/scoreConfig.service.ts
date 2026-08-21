/* =============================================================================
 * SCORE-CONFIG · scoreConfig.service.ts — Accès au modèle UNIQUE de score.
 * -----------------------------------------------------------------------------
 * Charge (et met en cache brièvement) la configuration de score éditée au
 * back-office, et l'expose sous forme de `ScoreKydosConfig` prête à l'emploi
 * pour belote-core. Fournit aussi la CLASSIFICATION du type de jeu (catégorie),
 * fonction pure et testée.
 * ========================================================================== */
import { resolveScoreKydosConfig, type ScoreKydosConfig, type GameCategory } from 'belote-core';
import { ScoreConfigModel } from './scoreConfig.model.js';

/** Éléments permettant de classer une partie en catégorie de coefficient. */
export interface GameClassificationInput {
  /** La partie appartient-elle à un tournoi ? */
  tournament?: boolean;
  /** La partie appartient-elle à un match de compétition (format/équipe) ? */
  competition?: boolean;
  /** La partie est-elle rattachée à une équipe ? */
  team?: boolean;
  /** Nombre de sièges humains (4 = pas de robot). */
  humanCount: number;
}

/**
 * Classe une partie en CATÉGORIE de coefficient (pure, testée). Priorité :
 * tournoi > compétition/équipe > présence de robot > partie rapide.
 *   • tournament — rattachée à un tournoi ;
 *   • team       — match de compétition ou partie d'équipe ;
 *   • robot      — comporte au moins un robot (humains < 4) ;
 *   • quick      — partie rapide entre humains.
 */
export function classifyGameCategory(input: GameClassificationInput): GameCategory {
  if (input.tournament) return 'tournament';
  if (input.competition || input.team) return 'team';
  if (input.humanCount < 4) return 'robot';
  return 'quick';
}

const CACHE_TTL_MS = 15_000;

export class ScoreConfigService {
  private cache: { config: ScoreKydosConfig; at: number } | null = null;

  /** Crée le document singleton avec les défauts s'il n'existe pas (idempotent). */
  async ensureSeeded(): Promise<void> {
    const exists = await ScoreConfigModel.exists({ key: 'default' });
    if (!exists) await ScoreConfigModel.create({ key: 'default' });
  }

  /**
   * Configuration résolue (defaults comblés), avec un court cache mémoire pour
   * éviter une lecture Mongo à chaque fin de partie. Ne lève jamais : en cas
   * d'erreur de lecture, retombe sur les valeurs par défaut.
   */
  async get(): Promise<ScoreKydosConfig> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache.config;
    try {
      const doc: any = await ScoreConfigModel.findOne({ key: 'default' }).lean();
      const config = resolveScoreKydosConfig(doc ?? undefined);
      this.cache = { config, at: Date.now() };
      return config;
    } catch {
      return resolveScoreKydosConfig(undefined);
    }
  }

  /** Invalide le cache (à appeler si la config est modifiée dans ce process). */
  invalidate(): void { this.cache = null; }
}

export const scoreConfigService = new ScoreConfigService();
