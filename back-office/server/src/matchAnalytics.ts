/* =============================================================================
 * BACK-OFFICE · matchAnalytics.ts — Agrégation PURE des parties d'une variante.
 * -----------------------------------------------------------------------------
 * À partir des documents Game rattachés à une variante de MATCH RAPIDE (ou un
 * tournoi), calcule des chiffres et pourcentages UTILES pour la page de
 * visualisation : nombre de parties, taux de victoire par équipe, scores et
 * manches moyens, taux de capot / belote, réussite des contrats, durée moyenne.
 *
 * Fonction PURE (aucune I/O) → testable seule. Reçoit des objets « Game-like »
 * (lean docs) et renvoie un objet d'agrégats.
 * ========================================================================== */

export interface GameLike {
  winner?: 'A' | 'B' | null;
  finalScoreA?: number; finalScoreB?: number;
  manchesWonA?: number; manchesWonB?: number;
  durationMs?: number;
  stats?: {
    totalDonnes?: number;
    capotsTotal?: number;
    belotesA?: number; belotesB?: number;
    contractsMade?: number; contractsFailed?: number;
    avgContract?: number;
  };
}

export interface VariantStats {
  gamesPlayed: number;
  winsA: number; winsB: number; draws: number;
  winRateA: number; winRateB: number;          // %
  avgScoreA: number; avgScoreB: number;
  avgManches: number;
  avgDonnes: number;
  avgDurationMs: number;
  capotRate: number;                            // % de parties avec ≥1 capot
  beloteRate: number;                           // % de parties avec ≥1 belote
  contractSuccessRate: number;                  // contrats tenus / total contrats %
  avgContract: number;
}

const pct = (num: number, den: number): number => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
const avg = (sum: number, n: number, dp = 0): number => {
  if (n <= 0) return 0;
  const f = Math.pow(10, dp);
  return Math.round((sum / n) * f) / f;
};

export function aggregateVariantStats(games: GameLike[]): VariantStats {
  const n = games.length;
  let winsA = 0, winsB = 0, draws = 0;
  let scoreA = 0, scoreB = 0, manches = 0, donnes = 0, duration = 0;
  let gamesWithCapot = 0, gamesWithBelote = 0;
  let made = 0, failed = 0, contractSum = 0, contractGames = 0;

  for (const g of games) {
    if (g.winner === 'A') winsA += 1;
    else if (g.winner === 'B') winsB += 1;
    else draws += 1;

    scoreA += g.finalScoreA ?? 0;
    scoreB += g.finalScoreB ?? 0;
    manches += (g.manchesWonA ?? 0) + (g.manchesWonB ?? 0);
    donnes += g.stats?.totalDonnes ?? 0;
    duration += g.durationMs ?? 0;

    if ((g.stats?.capotsTotal ?? 0) > 0) gamesWithCapot += 1;
    if (((g.stats?.belotesA ?? 0) + (g.stats?.belotesB ?? 0)) > 0) gamesWithBelote += 1;

    made += g.stats?.contractsMade ?? 0;
    failed += g.stats?.contractsFailed ?? 0;
    if ((g.stats?.avgContract ?? 0) > 0) { contractSum += g.stats!.avgContract!; contractGames += 1; }
  }

  return {
    gamesPlayed: n,
    winsA, winsB, draws,
    winRateA: pct(winsA, n),
    winRateB: pct(winsB, n),
    avgScoreA: avg(scoreA, n),
    avgScoreB: avg(scoreB, n),
    avgManches: avg(manches, n, 1),
    avgDonnes: avg(donnes, n, 1),
    avgDurationMs: avg(duration, n),
    capotRate: pct(gamesWithCapot, n),
    beloteRate: pct(gamesWithBelote, n),
    contractSuccessRate: pct(made, made + failed),
    avgContract: avg(contractSum, contractGames),
  };
}
