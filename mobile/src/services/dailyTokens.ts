/* =============================================================================
 * SERVICES · dailyTokens.ts — Récompense quotidienne de 500 jetons.
 * -----------------------------------------------------------------------------
 * L'utilisateur DÉBLOQUE 500 ◆ par jour en cliquant sur la pastille de monnaie ;
 * la récompense est créditée immédiatement. Persistance localStorage (démo) —
 * l'économie serveur (prélèvements/gains par mode) est prévue en tranche 4.
 * ========================================================================== */

export const DAILY_TOKENS = 500;
const KEY = 'kydos.tokens';
const KEY_DAY = 'kydos.tokens.day';

const today = (): string => new Date().toISOString().slice(0, 10);

export function tokenBalance(): number {
  const v = Number(localStorage.getItem(KEY));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

/** Vrai tant que la récompense du jour n'a pas été réclamée. */
export function canClaimToday(now: string = today()): boolean {
  return localStorage.getItem(KEY_DAY) !== now;
}

/** Réclame les 500 jetons du jour (une seule fois) ; renvoie le nouveau solde. */
export function claimDailyTokens(now: string = today()): { claimed: boolean; balance: number } {
  if (!canClaimToday(now)) return { claimed: false, balance: tokenBalance() };
  const balance = tokenBalance() + DAILY_TOKENS;
  localStorage.setItem(KEY, String(balance));
  localStorage.setItem(KEY_DAY, now);
  return { claimed: true, balance };
}

/** Débite un montant (utilisé lors des futures mises de partie). */
export function spendTokens(amount: number): { ok: boolean; balance: number } {
  const b = tokenBalance();
  if (b < amount) return { ok: false, balance: b };
  const balance = b - amount;
  localStorage.setItem(KEY, String(balance));
  return { ok: true, balance };
}
