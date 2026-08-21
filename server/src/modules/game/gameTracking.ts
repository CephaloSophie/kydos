/* =============================================================================
 * GAME · gameTracking.ts — Dérivations PURES du suivi enrichi d'une partie.
 * -----------------------------------------------------------------------------
 * v18 — À partir des donnes calculées par `computeGameStats` et du replay,
 * dérive des métriques supplémentaires embarquées sur le Game :
 *   • totalTricks     — plis joués (8 × donnes).
 *   • contractsMade   — contrats tenus par le preneur.
 *   • contractsFailed — contrats chutés (dedans).
 *   • avgContract     — valeur moyenne des contrats annoncés.
 *   • durationMs      — durée de la partie (1ᵉʳ → dernier horodatage d'op).
 *
 * Fonctions PURES (aucune I/O) → testables seules.
 * ========================================================================== */

export interface DonneLike {
  bidderTeam: 'A' | 'B' | null;
  contract: number | null;
  contractMet: boolean;
  tricks: { A: number; B: number };
}

export interface ExtraGameStats {
  totalTricks: number;
  contractsMade: number;
  contractsFailed: number;
  avgContract: number;
}

/** Dérive les métriques enrichies à partir des donnes d'une partie. */
export function deriveExtraStats(donnes: DonneLike[]): ExtraGameStats {
  let totalTricks = 0;
  let contractsMade = 0;
  let contractsFailed = 0;
  let contractSum = 0;
  let contractCount = 0;
  for (const d of donnes) {
    totalTricks += (d.tricks?.A ?? 0) + (d.tricks?.B ?? 0);
    if (d.bidderTeam) {
      if (d.contractMet) contractsMade += 1;
      else contractsFailed += 1;
    }
    if (typeof d.contract === 'number' && d.contract > 0) {
      contractSum += d.contract;
      contractCount += 1;
    }
  }
  return {
    totalTricks,
    contractsMade,
    contractsFailed,
    avgContract: contractCount ? Math.round(contractSum / contractCount) : 0,
  };
}

/**
 * Durée d'une partie (ms) = écart entre le 1ᵉʳ et le dernier horodatage `at`
 * trouvés dans les opérations du replay. 0 si indisponible / incohérent.
 */
export function replayDurationMs(replay: unknown): number {
  const manches = (replay as any)?.manches;
  if (!Array.isArray(manches)) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const m of manches) {
    for (const d of m?.donnes ?? []) {
      for (const op of d?.operations ?? []) {
        const at = op?.at;
        if (typeof at === 'number' && Number.isFinite(at)) {
          if (at < min) min = at;
          if (at > max) max = at;
        }
      }
    }
  }
  if (min === Infinity || max === -Infinity || max < min) return 0;
  return max - min;
}
