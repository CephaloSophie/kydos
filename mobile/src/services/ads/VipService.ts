/* =============================================================================
 * ADS · VipService.ts — Statut VIP (masque toute publicité).
 * -----------------------------------------------------------------------------
 * Un joueur VIP ne voit AUCUNE publicité. Le statut a une durée de validité,
 * achetée en jetons :
 *     600 jetons   → 1 jour
 *     4500 jetons  → 10 jours
 *     30000 jetons → 30 jours
 *
 * SERVEUR-PREMIER (aligné sur wallet.ts) : quand l'API expose le VIP, on lit /
 * achète côté serveur ; sinon on retombe sur un stockage local (démo, offline).
 * L'AdManager interroge `isVip()` avant tout affichage.
 * ========================================================================== */

export interface VipPlan {
  id: 'day' | 'days10' | 'days30';
  label: string;
  costTokens: number;
  durationDays: number;
}

export const VIP_PLANS: readonly VipPlan[] = [
  { id: 'day',    label: '1 jour',   costTokens: 600,   durationDays: 1 },
  { id: 'days10', label: '10 jours', costTokens: 4500,  durationDays: 10 },
  { id: 'days30', label: '30 jours', costTokens: 30000, durationDays: 30 },
];

export interface VipStatus {
  isVip: boolean;
  /** Date d'expiration ISO, ou null si non-VIP. */
  expiresAt: string | null;
  source: 'server' | 'local';
}

const STORAGE_KEY = 'kydos.vip.expiresAt';

/** Interface minimale attendue de l'API (branchée quand le serveur l'expose). */
export interface VipApi {
  isAuthenticated(): boolean;
  getVipStatus?(): Promise<{ expiresAt: string | null }>;
  purchaseVip?(planId: string): Promise<{ expiresAt: string | null; balance: number }>;
}

/** Callback de débit du porte-monnaie (délégué au wallet — ADS ignore la monnaie). */
export type SpendTokens = (amount: number, kind?: string) => Promise<{ balance: number }>;

export class VipService {
  #api: VipApi;
  #spend: SpendTokens | null;
  #cache: VipStatus | null = null;

  constructor(api: VipApi, spend?: SpendTokens) { this.#api = api; this.#spend = spend ?? null; }

  /** Statut courant (serveur si possible, sinon local). Mis en cache. */
  async status(): Promise<VipStatus> {
    if (this.#api.isAuthenticated() && this.#api.getVipStatus) {
      try {
        const r = await this.#api.getVipStatus();
        this.#cache = { isVip: this.#active(r.expiresAt), expiresAt: r.expiresAt, source: 'server' };
        return this.#cache;
      } catch { /* retombe en local */ }
    }
    const local = localStorage.getItem(STORAGE_KEY);
    this.#cache = { isVip: this.#active(local), expiresAt: local, source: 'local' };
    return this.#cache;
  }

  /** Réponse SYNCHRONE depuis le cache (pour les décisions d'affichage rapides). */
  isVipCached(): boolean {
    if (this.#cache) return this.#cache.isVip;
    return this.#active(localStorage.getItem(STORAGE_KEY));
  }

  /**
   * Achète (ou prolonge) le statut VIP selon un plan. **Débite les jetons** puis
   * étend la période. Serveur-premier ; en local on prolonge à partir de la date
   * d'expiration courante si encore valide (les achats se CUMULENT).
   */
  async purchase(planId: VipPlan['id']): Promise<VipStatus> {
    const plan = VIP_PLANS.find((p) => p.id === planId);
    if (!plan) throw new Error(`plan VIP inconnu : ${planId}`);

    if (this.#api.isAuthenticated() && this.#api.purchaseVip) {
      // Serveur : l'endpoint fait tout (débit + validité + réponse).
      try {
        const r = await this.#api.purchaseVip(planId);
        this.#cache = { isVip: this.#active(r.expiresAt), expiresAt: r.expiresAt, source: 'server' };
        return this.#cache;
      } catch { /* retombe en local */ }
    }

    // Local : DÉBIT du porte-monnaie AVANT tout — si le solde est insuffisant,
    // on ne prolonge rien (comportement cohérent avec l'attente utilisateur).
    if (!this.#spend) throw new Error('Débit de jetons indisponible.');
    await this.#spend(plan.costTokens, 'vip');

    // Prolongation cumulative depuis maintenant OU depuis l'expiration active.
    const current = localStorage.getItem(STORAGE_KEY);
    const base = this.#active(current) && current ? new Date(current) : new Date();
    base.setDate(base.getDate() + plan.durationDays);
    const iso = base.toISOString();
    localStorage.setItem(STORAGE_KEY, iso);
    this.#cache = { isVip: true, expiresAt: iso, source: 'local' };
    return this.#cache;
  }

  /** Une date d'expiration ISO est-elle dans le futur ? */
  #active(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    const t = Date.parse(expiresAt);
    return Number.isFinite(t) && t > Date.now();
  }
}
