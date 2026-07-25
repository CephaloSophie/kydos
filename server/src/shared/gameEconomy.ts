/**
 * Économie de partie — pur, testé.
 * Contrat produit (voir SPEC.md §3.9) :
 *   - mise humain : 100
 *   - mise robot  : 50
 *   - gains :
 *       * 4 humains        → 150 pour chaque humain gagnant
 *       * 2 humains + 2 R  → 225 pour l'humain gagnant
 *       * 4 robots         → 150 pour chaque robot gagnant
 * Le mode `local` (entraînement) est GRATUIT (mise 0 / gain 0).
 */

export const HUMAN_STAKE = 100;
export const ROBOT_STAKE = 50;
export const DAILY_REWARD = 500;

/** Description d'un siège pour le calcul de mise. */
export interface SeatEconomy { kind: 'human' | 'robot'; team: 'A' | 'B'; ownerUserId?: string; robotOwnerUserId?: string }

/** Contexte d'une partie facturable. */
export interface GameEconomyContext { mode: 'local' | 'online' | 'competition'; seats: SeatEconomy[]; winner: 'A' | 'B' | null }

/** Retourne la mise à débiter pour un siège selon le mode. */
export function stakeForSeat(ctx: GameEconomyContext, seat: SeatEconomy): number {
  if (ctx.mode === 'local') return 0;
  return seat.kind === 'human' ? HUMAN_STAKE : ROBOT_STAKE;
}

/**
 * Retourne le gain (par utilisateur) pour la partie donnée.
 * Les gains sont accordés au propriétaire du siège humain, ou au propriétaire
 * du robot pour un siège robot.
 *
 * Règles (docs/ai/SPEC.md §3.9) :
 *   - 4 humains : 150 par humain gagnant.
 *   - 2 humains + 2 robots : 225 pour l'humain gagnant (partenariat H+R).
 *   - 4 robots : 150 par robot gagnant → au propriétaire du robot.
 */
export function payoutsByUser(ctx: GameEconomyContext): Map<string, number> {
  const map = new Map<string, number>();
  if (ctx.mode === 'local' || !ctx.winner) return map;

  const humans = ctx.seats.filter((s) => s.kind === 'human').length;
  const robots = 4 - humans;
  const winners = ctx.seats.filter((s) => s.team === ctx.winner);

  const add = (userId: string | undefined, amount: number) => {
    if (!userId) return;
    map.set(userId, (map.get(userId) ?? 0) + amount);
  };

  if (humans === 4) {
    for (const seat of winners) if (seat.kind === 'human') add(seat.ownerUserId, 150);
  } else if (humans === 2 && robots === 2) {
    for (const seat of winners) if (seat.kind === 'human') add(seat.ownerUserId, 225);
  } else if (humans === 0) {
    for (const seat of winners) if (seat.kind === 'robot') add(seat.robotOwnerUserId, 150);
  } else {
    // 1H+3R ou 3H+1R : gains égaux au barème 4H prorata simple (150 par humain gagnant).
    for (const seat of winners) if (seat.kind === 'human') add(seat.ownerUserId, 150);
  }
  return map;
}

/** Coût total à prélever pour un utilisateur (somme de ses sièges humains + ses robots). */
export function stakesByUser(ctx: GameEconomyContext): Map<string, number> {
  const map = new Map<string, number>();
  if (ctx.mode === 'local') return map;
  const add = (userId: string | undefined, amount: number) => {
    if (!userId) return;
    map.set(userId, (map.get(userId) ?? 0) + amount);
  };
  for (const seat of ctx.seats) {
    if (seat.kind === 'human') add(seat.ownerUserId, HUMAN_STAKE);
    else add(seat.robotOwnerUserId, ROBOT_STAKE);
  }
  return map;
}
