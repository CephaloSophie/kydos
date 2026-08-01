/* =============================================================================
 * ADS · AdManager.ts — Orchestration des publicités (règles métier).
 * -----------------------------------------------------------------------------
 * Point d'entrée UNIQUE de l'application pour la publicité. Il :
 *   • connaît le fournisseur (via le registre) et le statut VIP (VipService) ;
 *   • applique les RÈGLES : un VIP ne voit rien ; anti-spam entre interstitiels ;
 *     minuterie de navigation pour l'App Open (3 min hors table) ;
 *   • expose des méthodes d'EMPLACEMENT lisibles par les écrans
 *     (afterGame, beforeCreateTable, beforeLaunchSaved, beforeTraining,
 *     resumeAfterNavigation, banner show/hide, rewarded daily / extra).
 *
 * Les écrans n'appellent JAMAIS un fournisseur directement : ils demandent un
 * EMPLACEMENT, l'AdManager décide. La monnaie/récompense est déléguée à un
 * callback `onReward` fourni à l'init (le module ads ne connaît pas le wallet).
 * ========================================================================== */
import type { AdProvider, AdPlacement, RewardResult, ShowResult } from './types';
import type { EventBus } from '../../core/EventBus';
import { AD_SETTINGS } from './adConfig';
import { createAdProvider } from './registry';
import { VipService } from './VipService';
import { isNativePlatform } from './platform';

export interface AdManagerDeps {
  bus: EventBus;
  vip: VipService;
  /** Crédite des jetons pour une récompense (délégué au wallet). */
  onReward: (amount: number) => Promise<void> | void;
  /** Fournit le statut « récompense quotidienne déjà prise ? ». */
  hasClaimedDaily: () => Promise<boolean> | boolean;
  /** Fournisseur explicite (tests) ; sinon construit depuis la config. */
  provider?: AdProvider;
}

export class AdManager {
  #provider: AdProvider;
  #bus: EventBus;
  #vip: VipService;
  #onReward: AdManagerDeps['onReward'];
  #hasClaimedDaily: AdManagerDeps['hasClaimedDaily'];

  #initialized = false;
  #bannerVisible = false;
  #lastInterstitialAt = 0;
  #bannerTimer: ReturnType<typeof setInterval> | null = null;

  // Minuterie App Open : armée après 3 min de navigation HORS table ; déclenchée
  // au prochain accès à un écran éligible (accueil, robots… pas la table online).
  #navTimer: ReturnType<typeof setTimeout> | null = null;
  #appOpenArmed = false;

  constructor(deps: AdManagerDeps) {
    this.#bus = deps.bus;
    this.#vip = deps.vip;
    this.#onReward = deps.onReward;
    this.#hasClaimedDaily = deps.hasClaimedDaily;
    this.#provider = deps.provider ?? createAdProvider();
  }

  /** Initialise le SDK et précharge les formats. Idempotent. */
  async initialize(): Promise<void> {
    if (this.#initialized) return;
    this.#initialized = true;
    await this.#vip.status(); // amorce le cache VIP
    await this.#provider.initialize();
    // Préchargements en tâche de fond (sans bloquer).
    void this.#provider.prepareInterstitial();
    void this.#provider.prepareRewarded();
    void this.#provider.prepareAppOpen();
  }

  /** Un VIP ne voit aucune publicité. */
  #adsDisabled(): boolean { return this.#vip.isVipCached(); }

  // ── Bannière adaptive (emplacement unique, bas de l'écran) ────────────────
  async showBanner(): Promise<void> {
    if (this.#adsDisabled() || !isNativePlatform()) { await this.hideBanner(); return; }
    if (this.#bannerVisible) return;
    this.#bannerVisible = true;
    try {
      await this.#provider.showBanner();
      this.#bus.emit('ads:banner-loaded', { network: this.#provider.network });
      this.#armBannerRefresh();
    } catch (e) { this.#bus.emit('ads:banner-failed', { network: this.#provider.network, error: String(e) }); }
  }

  async hideBanner(): Promise<void> {
    this.#clearBannerRefresh();
    if (!this.#bannerVisible) return;
    this.#bannerVisible = false;
    try { await this.#provider.hideBanner(); } catch { /* ignore */ }
  }

  /** Recharge la bannière à intervalle régulier (rafraîchissement auto). */
  #armBannerRefresh(): void {
    this.#clearBannerRefresh();
    this.#bannerTimer = setInterval(() => {
      if (!this.#bannerVisible || this.#adsDisabled()) { this.#clearBannerRefresh(); return; }
      // Recharge : masque puis réaffiche (une nouvelle impression = nouveau revenu).
      void this.#provider.hideBanner()
        .then(() => this.#provider.showBanner())
        .then(() => this.#bus.emit('ads:banner-loaded', { network: this.#provider.network }))
        .catch((e) => this.#bus.emit('ads:banner-failed', { network: this.#provider.network, error: String(e) }));
    }, AD_SETTINGS.bannerRefreshMs);
  }
  #clearBannerRefresh(): void { if (this.#bannerTimer) { clearInterval(this.#bannerTimer); this.#bannerTimer = null; } }

  // ── Interstitiels (règle anti-spam commune) ───────────────────────────────
  async #showInterstitial(placement: AdPlacement): Promise<ShowResult> {
    if (this.#adsDisabled()) return { shown: false, reason: 'vip' };
    if (!isNativePlatform()) return { shown: false, reason: 'not-native' };
    if (Date.now() - this.#lastInterstitialAt < AD_SETTINGS.interstitialMinGapMs) {
      return { shown: false, reason: 'frequency-capped' };
    }
    const res = await this.#provider.showInterstitial();
    if (res.shown) { this.#lastInterstitialAt = Date.now(); this.#bus.emit('ads:interstitial-shown', { placement }); }
    return res;
  }

  /** Après chaque partie. */
  afterGame(): Promise<ShowResult> { return this.#showInterstitial('interstitial-postgame'); }
  /** Avant de créer une table. */
  beforeCreateTable(): Promise<ShowResult> { return this.#showInterstitial('interstitial-create-table'); }
  /** Avant de lancer une partie sauvegardée. */
  beforeLaunchSaved(): Promise<ShowResult> { return this.#showInterstitial('interstitial-launch-saved'); }

  // ── App Open ──────────────────────────────────────────────────────────────
  /** Avant une partie d'entraînement. */
  async beforeTraining(): Promise<ShowResult> {
    if (this.#adsDisabled()) return { shown: false, reason: 'vip' };
    if (!isNativePlatform()) return { shown: false, reason: 'not-native' };
    const res = await this.#provider.showAppOpen();
    if (res.shown) this.#bus.emit('ads:appopen-shown', { placement: 'appopen-training' });
    return res;
  }

  /**
   * Signale un changement d'écran. La minuterie de 3 min ne court QUE hors de la
   * table de jeu en ligne. Après 3 min, l'App Open est « armée » et se déclenche
   * au prochain accès à un écran éligible (tout sauf la table online).
   */
  notifyScreen(screen: string): void {
    const inOnlineTable = screen === 'table' || screen === 'online';
    if (inOnlineTable) { this.#clearNavTimer(); return; }

    // Écran éligible : si l'App Open est armée, on la montre puis on réarme.
    if (this.#appOpenArmed) { this.#appOpenArmed = false; void this.#resumeAppOpen(); }
    this.#restartNavTimer();
  }

  #restartNavTimer(): void {
    if (this.#adsDisabled() || !isNativePlatform()) return;
    this.#clearNavTimer();
    this.#navTimer = setTimeout(() => { this.#appOpenArmed = true; }, AD_SETTINGS.appOpenResumeAfterMs);
  }
  #clearNavTimer(): void { if (this.#navTimer) { clearTimeout(this.#navTimer); this.#navTimer = null; } }

  async #resumeAppOpen(): Promise<void> {
    if (this.#adsDisabled() || !isNativePlatform()) return;
    const res = await this.#provider.showAppOpen();
    if (res.shown) this.#bus.emit('ads:appopen-shown', { placement: 'appopen-resume' });
  }

  // ── Récompensées ──────────────────────────────────────────────────────────
  /**
   * Pub récompensée liée aux jetons quotidiens : si le quotidien n'est pas
   * encore pris, la récompense = quotidien ; sinon +100 jetons par visionnage.
   * Le crédit réel est délégué à `onReward`.
   */
  async watchRewarded(): Promise<RewardResult> {
    // Un VIP peut tout de même gagner des jetons s'il le souhaite : la pub
    // récompensée est un CHOIX, pas une pub imposée. On ne la bloque donc pas.
    if (!isNativePlatform()) {
      // Dev/web : on simule une récompense pour ne pas bloquer le parcours.
      const amount = await this.#rewardAmount();
      await this.#grant(amount);
      return { rewarded: true, amount };
    }
    const res = await this.#provider.showRewarded();
    if (res.rewarded) {
      const amount = res.amount > 0 ? res.amount : await this.#rewardAmount();
      await this.#grant(amount);
      return { rewarded: true, amount };
    }
    return res;
  }

  async #rewardAmount(): Promise<number> {
    const claimed = await this.#hasClaimedDaily();
    return claimed ? AD_SETTINGS.extraRewardTokens : AD_SETTINGS.dailyRewardTokens;
  }
  async #grant(amount: number): Promise<void> {
    await this.#onReward(amount);
    this.#bus.emit('ads:reward-granted', { amount });
  }

  /** Réseau actif (diagnostic / UI). */
  get network() { return this.#provider.network; }
  /** Nettoyage (à la fermeture / logout). */
  dispose(): void { this.#clearNavTimer(); this.#clearBannerRefresh(); void this.hideBanner(); }
}
