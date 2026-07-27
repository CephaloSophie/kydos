// ============================================================================
//  Couche de points « récompense » (profil joueur) — formule explicite.
//  IMPORTANT : couche distincte du score de cartes belote (152/162). Sert au
//  classement / progression du joueur. DÉSACTIVÉE en partie locale avec robots.
// ============================================================================

export interface RewardInput {
  /** Score de cartes de mon équipe sur la manche. */
  myScore: number;
  /** Score de cartes de l'équipe adverse sur la manche. */
  oppScore: number;
  /** Ai-je gagné la manche ? */
  wonManche: boolean;
  /** Objectif de la manche (1500 ou 2000). */
  mancheTarget: 1500 | 2000;
  /** Ai-je gagné la partie ? */
  wonPartie: boolean;
  /** Nombre de manches de la partie (1, 2 ou 4). */
  partieManches: 1 | 2 | 4;
  /** Détails « score D ». */
  advDedans: number;
  capotsDeclaresRealises: number;
  contreesGagnees: number;
  surcontreesGagnees: number;
  /** Partie locale d'entraînement avec mes robots -> aucun point. */
  local: boolean;
}

export interface RewardBreakdown {
  default: number;
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}

const PARTIE_BONUS: Record<number, number> = { 1: 0, 2: 3000, 4: 6000 };

export function computeReward(input: RewardInput): RewardBreakdown {
  if (input.local) {
    return { default: 0, A: 0, B: 0, C: 0, D: 0, total: 0 };
  }
  const base = 100;
  const A = Math.max(0, input.myScore - input.oppScore);
  const B = input.wonManche ? input.mancheTarget : 0;
  const C = input.wonPartie ? PARTIE_BONUS[input.partieManches] ?? 0 : 0;
  const D =
    160 * input.advDedans +
    500 * input.capotsDeclaresRealises +
    320 * input.contreesGagnees +
    640 * input.surcontreesGagnees;
  return { default: base, A, B, C, D, total: base + A + B + C + D };
}
