import { levelForScore, DEFAULT_SCORE_KYDOS, type ScoreKydosConfig } from 'belote-core';

/**
 * Niveau d'un joueur/robot dérivé de son score cumulé, via le modèle UNIQUE
 * Kýdos (échelle de niveaux éditée au back-office). Sans configuration fournie,
 * on applique l'échelle par défaut (500 pts, +8 %/niveau) — c'est la SEULE
 * définition du niveau dans l'application (plus de `1 + floor(score/100)`).
 *
 * @param score  score cumulé (User.rewardPoints ou Robot.score).
 * @param config configuration de score (optionnelle) ; défaut = barème standard.
 */
export function computePlayerLevel(score: number, config: ScoreKydosConfig = DEFAULT_SCORE_KYDOS): number {
  return levelForScore(config, score ?? 0).level;
}
