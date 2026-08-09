/* =============================================================================
 * TOURNAMENTS · economics.ts — Calcul de rentabilité (fonction PURE).
 * -----------------------------------------------------------------------------
 * Répond à la question : « ce tournoi est-il rentable pour kydos ? »
 *
 * Prend en entrée les paramètres d'un tournoi (capacity, entryFee, rounds
 * avec leurs prix) et calcule :
 *   • totalCollected — buy-in × capacity
 *   • totalPaid      — somme (survivants à ce round) × prize
 *   • houseNet       — collected − paid (positif = kydos gagne)
 *   • breakdown      — détail par round (pour affichage back office)
 *
 * Élimination directe pure : nombre de survivants au round N = capacity / 2^N.
 * Round 1 = tous ; round 2 = moitié ; etc. jusqu'au dernier round (1 gagnant).
 *
 * Zéro I/O, zéro dépendance — testable trivialement.
 * ========================================================================== */

export interface RoundPrize {
  round: number;
  prize: number;
}

export interface EconomicsInput {
  capacity: number;
  entryFee: number;
  rounds: RoundPrize[];
}

export interface EconomicsBreakdownRow {
  round: number;
  survivors: number;
  prizePerSurvivor: number;
  totalPaidThisRound: number;
}

export interface EconomicsResult {
  totalCollected: number;
  totalPaid: number;
  houseNet: number;                 // signé : + = kydos gagne
  breakdown: EconomicsBreakdownRow[];
}

/** Nombre de survivants au round N (1-indexé) pour un bracket capacity. */
export function survivorsAtRound(capacity: number, round: number): number {
  if (round < 1) return 0;
  const s = capacity / Math.pow(2, round - 1);
  return Math.max(0, Math.floor(s));
}

/** Calcule la rentabilité complète du tournoi. */
export function tournamentEconomics(input: EconomicsInput): EconomicsResult {
  const totalCollected = input.capacity * input.entryFee;
  const breakdown: EconomicsBreakdownRow[] = [];
  let totalPaid = 0;
  for (const rp of input.rounds) {
    const survivors = survivorsAtRound(input.capacity, rp.round);
    const totalPaidThisRound = survivors * rp.prize;
    totalPaid += totalPaidThisRound;
    breakdown.push({ round: rp.round, survivors, prizePerSurvivor: rp.prize, totalPaidThisRound });
  }
  return {
    totalCollected,
    totalPaid,
    houseNet: totalCollected - totalPaid,
    breakdown,
  };
}
