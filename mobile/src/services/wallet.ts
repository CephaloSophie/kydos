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

/** Requête réseau en cours — déduplique les appels concurrents. */
let inflightRead: Promise<WalletState> | null = null;

/**
 * Récupère le solde et le statut de réclamation quotidien.
 * Essaie le serveur d'abord ; retombe en local en cas d'erreur (offline).
 * **Déduplication** : plusieurs appels concurrents partagent la même requête
 * réseau — évite les doublons quand TopBar et un écran demandent en parallèle.
 */
export async function readWallet(): Promise<WalletState> {
  if (!api.isAuthenticated()) return { balance: localBalance(), canClaim: localCan(), source: 'local' };
  if (inflightRead) return inflightRead;
  const run = async (): Promise<WalletState> => {
    try {
      const w: ServerWallet = await api.wallet();
      return { balance: w.balance, canClaim: w.canClaimToday, source: 'server' };
    } catch {
      return { balance: localBalance(), canClaim: localCan(), source: 'local' };
    }
  };
  inflightRead = run().finally(() => { inflightRead = null; });
  return inflightRead;
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

/**
 * Crédite une récompense de jetons (pub récompensée). Le crédit local est
 * immédiat (démo/offline). Un endpoint serveur dédié aux récompenses pub est
 * prévu (économie serveur, tranche ultérieure) : quand il existera, on
 * l'appellera ici en priorité, comme pour claimDaily.
 */
export async function creditReward(amount: number): Promise<{ balance: number; source: 'server' | 'local' }> {
  // Crédit local (source de vérité en démo). Réutilise le store dailyTokens.
  const balance = localBalance() + Math.max(0, Math.round(amount));
  try { localStorage.setItem('kydos.tokens', String(balance)); } catch { /* stockage indispo */ }
  return { balance, source: 'local' };
}

/**
 * DÉBITE des jetons du solde (achat VIP, autres dépenses). Lève si solde
 * insuffisant. Débit LOCAL immédiat ; un endpoint serveur générique de dépense
 * arrivera dans une prochaine tranche d'économie serveur.
 */
export async function spendTokens(amount: number, _kind = 'spend'): Promise<{ balance: number; source: 'server' | 'local' }> {
  const cost = Math.max(0, Math.round(amount));
  const before = localBalance();
  if (before < cost) throw new Error('Solde insuffisant');
  const balance = before - cost;
  try { localStorage.setItem('kydos.tokens', String(balance)); } catch { /* stockage indispo */ }
  return { balance, source: 'local' };
}
