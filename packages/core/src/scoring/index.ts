/**
 * MODULE SCORING — point d'entrée unique et INDÉPENDANT du calcul de score.
 *
 * Regroupe, en un seul endroit, tout ce qui « compte les points » :
 *   • valeur des cartes (barème atout / hors-atout)         → cardValue / cardStrength
 *   • score d'une donne/manche (der, arrondi, contrat, capot,
 *     belote, contre/surcontre)                             → scoreManche / roundPoints
 *   • points de récompense joueur                            → computeReward
 *
 * Objectif : pouvoir corriger les règles de score à UN seul endroit, et tester ce
 * calcul isolément (fonctions pures, sans dépendance au moteur de jeu).
 */

// Barème des cartes (réexporté depuis le domaine, qui reste la source des constantes).
export { cardValue, cardStrength } from '../domain/cards';

// Score d'une donne/manche : fonctions pures (entrée + barème -> résultat).
export { scoreManche, roundPoints } from './donneScoring';

// Points de récompense (système de points joueur).
export * from './rewardScoring';

// Types d'entrée/sortie du calcul de score.
export type { MancheScoreInput, MancheScoreResult } from '../rules/RulesEngine';
export type { RulesConfig } from '../rules/RulesConfig';

// Statistiques détaillées de partie (dérivées du replay) — SPEC §3.10.
export { computeGameStats } from './GameStats';
export type { GameStats, DonneStat } from './GameStats';

// Modèle UNIQUE et central de score & niveau (barème de gain, échelle de
// niveaux, diagnostic). Édité au back-office, appliqué partout.
export * from './scoreKydos';
