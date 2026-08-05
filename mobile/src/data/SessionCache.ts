/* =============================================================================
 * DATA · SessionCache.ts — Cache de session (profil, wallet, VIP, robots).
 * -----------------------------------------------------------------------------
 * Charge les données de session UNE SEULE FOIS au lancement, les garde en
 * mémoire ET les persiste (persistentStorage) pour un démarrage instantané et
 * un fonctionnement hors-ligne du mode solo.
 *
 * PRINCIPE : le serveur reste l'AUTORITÉ. Le cache est un miroir accéléré.
 *   • Lecture : synchrone depuis la mémoire (jamais d'appel réseau au clic).
 *   • Rafraîchissement : CIBLÉ, uniquement quand une donnée change réellement
 *     (achat VIP → refreshVip ; récompense/claim → refreshWallet ; création/
 *      suppression de robot → refreshRobots). Jamais à chaque navigation.
 *   • Hors-ligne : si un refresh échoue, on GARDE la dernière valeur connue
 *     (persistée) — le mode solo continue de fonctionner avec les robots en
 *     cache. La création de robot et le jeu en ligne, eux, exigent le réseau
 *     (gérés côté écran).
 *
 * ÉVÉNEMENTS : chaque mise à jour émet un événement sur le bus
 * (`session:profile`, `session:wallet`, `session:vip`, `session:robots`) pour
 * que le TopBar et les écrans se rafraîchissent sans polling.
 * ========================================================================== */
import type { ApiClient, ServerRobot, ServerWallet } from './ApiClient';
import type { EventBus } from '../core/EventBus';
import { persistGet, persistSet, persistClearAll } from './persistentStorage';

export interface SessionProfile { id: string; username: string; email?: string | null; activeSession?: string | null }
export interface SessionWallet { balance: number; canClaimToday: boolean }
export interface SessionVip { isVip: boolean; expiresAt: string | null }

interface SessionSnapshot {
  profile: SessionProfile | null;
  wallet: SessionWallet | null;
  vip: SessionVip | null;
  robots: ServerRobot[] | null;
}

const KEYS = { profile: 'session.profile', wallet: 'session.wallet', vip: 'session.vip', robots: 'session.robots' } as const;

/** VIP actif si l'expiration est dans le futur. */
function vipActive(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t > Date.now();
}

export class SessionCache {
  #api: ApiClient;
  #bus: EventBus;

  // État en mémoire — hydraté depuis le disque au constructeur pour un
  // démarrage instantané, puis rafraîchi depuis le serveur au bootstrap.
  #profile: SessionProfile | null;
  #wallet: SessionWallet | null;
  #vip: SessionVip | null;
  #robots: ServerRobot[] | null;

  #hydrated = false; // le bootstrap réseau a-t-il réussi au moins une fois ?

  constructor(api: ApiClient, bus: EventBus) {
    this.#api = api;
    this.#bus = bus;
    // Hydratation immédiate depuis le disque (peut être null au tout premier lancement).
    this.#profile = persistGet<SessionProfile>(KEYS.profile);
    this.#wallet = persistGet<SessionWallet>(KEYS.wallet);
    this.#vip = persistGet<SessionVip>(KEYS.vip);
    this.#robots = persistGet<ServerRobot[]>(KEYS.robots);
  }

  // ── Getters SYNCHRONES (aucun appel réseau) ───────────────────────────────
  get profile(): SessionProfile | null { return this.#profile; }
  get wallet(): SessionWallet | null { return this.#wallet; }
  get vip(): SessionVip { return this.#vip ?? { isVip: false, expiresAt: null }; }
  get robots(): ServerRobot[] { return this.#robots ?? []; }
  get isVip(): boolean { return vipActive(this.vip.expiresAt); }
  get hydrated(): boolean { return this.#hydrated; }
  /** Vrai si on a au moins des robots en cache → le mode solo est jouable hors-ligne. */
  get canPlayOffline(): boolean { return (this.#robots?.length ?? 0) > 0; }

  // ── Écritures internes (mémoire + disque + événement) ─────────────────────
  #setProfile(p: SessionProfile | null) { this.#profile = p; persistSet(KEYS.profile, p); this.#bus.emit('session:profile', p); }
  #setWallet(w: SessionWallet | null) { this.#wallet = w; persistSet(KEYS.wallet, w); this.#bus.emit('session:wallet', w); }
  #setVip(v: SessionVip | null) { this.#vip = v; persistSet(KEYS.vip, v); this.#bus.emit('session:vip', v); }
  #setRobots(r: ServerRobot[] | null) { this.#robots = r; persistSet(KEYS.robots, r); this.#bus.emit('session:robots', r); }

  // ── Rafraîchissements CIBLÉS (appelés seulement quand ça change) ───────────

  /** Recharge le profil depuis le serveur. Garde l'ancien en cas d'échec. */
  async refreshProfile(): Promise<void> {
    try {
      const { user } = await this.#api.me();
      const u = user as unknown as { id: string; username: string; email?: string | null; activeSession?: string | null };
      this.#setProfile({ id: u.id, username: u.username, email: u.email, activeSession: u.activeSession ?? null });
    } catch { /* hors-ligne : on garde la valeur persistée */ }
  }

  /** Recharge le porte-monnaie. Garde l'ancien en cas d'échec. */
  async refreshWallet(): Promise<void> {
    if (!this.#api.isAuthenticated()) return;
    try {
      const w: ServerWallet = await this.#api.wallet();
      this.#setWallet({ balance: w.balance, canClaimToday: w.canClaimToday });
    } catch { /* hors-ligne : on garde la valeur persistée */ }
  }

  /** Recharge le statut VIP. Garde l'ancien en cas d'échec. */
  async refreshVip(): Promise<void> {
    if (!this.#api.isAuthenticated() || !this.#api.getVipStatus) return;
    try {
      const { expiresAt } = await this.#api.getVipStatus();
      this.#setVip({ isVip: vipActive(expiresAt), expiresAt });
    } catch { /* hors-ligne : on garde la valeur persistée */ }
  }

  /** Recharge la liste des robots. Garde l'ancienne en cas d'échec. */
  async refreshRobots(): Promise<void> {
    if (!this.#api.isAuthenticated()) return;
    try {
      const { robots } = await this.#api.listRobots();
      this.#setRobots(robots);
    } catch { /* hors-ligne : on garde la liste persistée (mode solo jouable) */ }
  }

  /**
   * Chargement initial COMPLET (appelé une fois au bootstrap, pendant la page
   * waiting). Les quatre ressources sont chargées en parallèle. Si le réseau
   * échoue, on reste sur les valeurs persistées (démarrage hors-ligne possible
   * dès la 2ᵉ ouverture de l'app).
   */
  async loadAll(): Promise<void> {
    if (!this.#api.isAuthenticated()) return;
    await Promise.allSettled([
      this.refreshProfile(),
      this.refreshWallet(),
      this.refreshVip(),
      this.refreshRobots(),
    ]);
    this.#hydrated = true;
  }

  /** Applique directement un nouveau solde (après une réponse serveur d'achat/récompense). */
  applyWallet(balance: number, canClaimToday?: boolean): void {
    this.#setWallet({ balance, canClaimToday: canClaimToday ?? this.#wallet?.canClaimToday ?? false });
  }

  /** Applique directement une nouvelle expiration VIP (après un achat serveur). */
  applyVip(expiresAt: string | null): void {
    this.#setVip({ isVip: vipActive(expiresAt), expiresAt });
  }

  /** Efface tout (déconnexion). */
  clear(): void {
    this.#profile = null; this.#wallet = null; this.#vip = null; this.#robots = null;
    this.#hydrated = false;
    persistClearAll();
    this.#bus.emit('session:cleared', null);
  }

  /** Instantané mémoire (debug / tests). */
  snapshot(): SessionSnapshot {
    return { profile: this.#profile, wallet: this.#wallet, vip: this.#vip, robots: this.#robots };
  }
}
