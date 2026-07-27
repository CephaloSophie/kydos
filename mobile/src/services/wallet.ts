/* =============================================================================
 * SERVICES · wallet.ts — Porte-monnaie côté mobile.
 * -----------------------------------------------------------------------------
 * SERVEUR-PREMIER : lit / crédite via l'API si l'utilisateur est connecté.
 * FALLBACK : utilise `dailyTokens` (localStorage) en cas d'échec réseau
 * (mode démo hors-ligne, présentation sans backend). Toute la logique
 * d'affichage de la pastille de monnaie et du dialogue de réclamation passe
 * par ce module — il masque la source (serveur ou local).
 * ========================================================================== */
import { api, type ServerWallet } from '../data/ApiClient';
import { claimDailyTokens as localClaim, tokenBalance as localBalance, canClaimToday as localCan } from './dailyTokens';

export interface WalletState { balance: number; canClaim: boolean; source: 'server' | 'local' }

/**
 * Récupère le solde et le statut de réclamation quotidien.
 * Essaie le serveur d'abord ; retombe en local en cas d'erreur (offline).
 */
export async function readWallet(): Promise<WalletState> {
  if (!api.isAuthenticated()) return { balance: localBalance(), canClaim: localCan(), source: 'local' };
  try {
    const w: ServerWallet = await api.wallet();
    return { balance: w.balance, canClaim: w.canClaimToday, source: 'server' };
  } catch {
    return { balance: localBalance(), canClaim: localCan(), source: 'local' };
  }
}

/**
 * Débloque la récompense quotidienne (500 jetons).
 * Priorité au serveur — le fallback local garantit une expérience fluide en démo.
 */
export async function claimDaily(): Promise<{ claimed: boolean; balance: number; source: 'server' | 'local' }> {
  if (!api.isAuthenticated()) {
    const r = localClaim();
    return { claimed: r.claimed, balance: r.balance, source: 'local' };
  }
  try {
    const r = await api.claimDailyTokens();
    return { claimed: r.claimed, balance: r.balance, source: 'server' };
  } catch {
    const r = localClaim();
    return { claimed: r.claimed, balance: r.balance, source: 'local' };
  }
}
