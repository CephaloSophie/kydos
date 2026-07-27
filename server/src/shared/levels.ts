/** Niveau d'un joueur dérivé de ses points de récompense (1 niveau / 100 points). */
export function computePlayerLevel(rewardPoints: number): number {
  return 1 + Math.floor((rewardPoints ?? 0) / 100);
}
