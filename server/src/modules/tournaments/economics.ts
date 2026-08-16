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

/* ── v14.12 — Variante « prix par POSITION finale » (avec ex æquo) ────────── */

export interface PositionPrize {
  position: number;   // rang final (1, 2, 3, 5, 9, …)
  prize: number;      // prix versé à CHAQUE occupant du rang
}

export interface EconomicsByPositionInput {
  capacity: number;
  entryFee: number;
  prizesByPosition: PositionPrize[];
}

export interface EconomicsByPositionRow {
  position: number;
  occupants: number;          // combien de personnes à ce rang (ex æquo)
  prizePerOccupant: number;
  totalPaidAtThisPosition: number;
}

export interface EconomicsByPositionResult {
  totalCollected: number;
  totalPaid: number;
  houseNet: number;
  breakdown: EconomicsByPositionRow[];
}

/**
 * Nombre d'occupants à un rang final donné dans un bracket élimination
 * directe. Renvoie 0 si le rang n'existe pas pour cette capacité.
 *
 * Rangs valides : 1, 2, 3, 5, 9, 17, 33, 65, … chacun avec 1, 1, 2, 4, 8,
 * 16, 32, 64 occupants respectivement.
 */
export function occupantsAtPosition(capacity: number, position: number): number {
  if (position === 1 || position === 2) return 1;
  let rank = 3;
  let losers = 2;
  while (losers <= capacity / 2) {
    if (rank === position) return losers;
    rank += losers;
    losers *= 2;
  }
  return 0;
}

/**
 * Économie basée sur prizes-by-position (v14.12). Chaque prize est versé à
 * chaque occupant du rang. Si l'utilisateur définit un prix pour un rang qui
 * n'existe pas dans la capacity, `occupants=0` → contribution nulle.
 */
export function tournamentEconomicsByPosition(input: EconomicsByPositionInput): EconomicsByPositionResult {
  const totalCollected = input.capacity * input.entryFee;
  const breakdown: EconomicsByPositionRow[] = [];
  let totalPaid = 0;
  for (const pp of input.prizesByPosition) {
    const occupants = occupantsAtPosition(input.capacity, pp.position);
    const totalPaidAtThisPosition = occupants * pp.prize;
    totalPaid += totalPaidAtThisPosition;
    breakdown.push({ position: pp.position, occupants, prizePerOccupant: pp.prize, totalPaidAtThisPosition });
  }
  return {
    totalCollected,
    totalPaid,
    houseNet: totalCollected - totalPaid,
    breakdown,
  };
}
