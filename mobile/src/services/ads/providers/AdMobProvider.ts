/* =============================================================================
 * ADS · providers/AdMobProvider.ts — Fournisseur Google AdMob (DÉFAUT).
 * -----------------------------------------------------------------------------
 * Bridge vers le plugin natif @capacitor-community/admob **v6+**. La dépendance
 * est DOUCE : importée dynamiquement à l'initialisation, de sorte que l'app
 * COMPILE et FONCTIONNE même si le plugin n'est pas installé.
 *
 * Installation native (voir docs/ADS.md) :
 *   npm i @capacitor-community/admob
 *   npx cap sync android
 * puis renseigner l'App ID AdMob dans AndroidManifest.xml (ou Info.plist).
 *
 * API v6 (référence : https://github.com/capacitor-community/admob) :
 *   • Bannière       showBanner / hideBanner
 *   • Interstitiel   prepareInterstitial + showInterstitial
 *   • Récompensée    prepareRewardVideoAd + showRewardVideoAd
 *                    événement RewardAdPluginEvents.Rewarded
 *   • App Open       loadAppOpen + isAppOpenLoaded + showAppOpen
 *   • Consentement   requestConsentInfo + showConsentForm (obligatoire en EEA)
 * ========================================================================== */
import type { AdProvider, AdUnitIds, RewardResult, ShowResult } from '../types';
import { getPlatform } from '../platform';

/* Types minimaux du plugin (évite d'exiger le package à la compilation). */
interface AdMobPlugin {
  initialize(opts?: unknown): Promise<void>;
  requestConsentInfo?(opts?: unknown): Promise<{ status?: string; isConsentFormAvailable?: boolean }>;
  showConsentForm?(): Promise<{ status?: string }>;

  showBanner(opts: unknown): Promise<void>;
  hideBanner(): Promise<void>;
  removeBanner?(): Promise<void>;

  prepareInterstitial(opts: unknown): Promise<void>;
  showInterstitial(): Promise<void>;

  prepareRewardVideoAd(opts: unknown): Promise<void>;
  showRewardVideoAd(): Promise<{ type?: string; amount?: number } | void>;

  loadAppOpen?(opts: unknown): Promise<void>;
  isAppOpenLoaded?(): Promise<{ value?: boolean } | boolean>;
  showAppOpen?(): Promise<void>;

  addListener(event: string, cb: (info: unknown) => void): Promise<unknown> | unknown;
}

/** Nom de l'événement de récompense (v6). */
const REWARD_EVENT_REWARDED = 'onRewardedVideoAdReward';

export class AdMobProvider implements AdProvider {
  readonly network = 'admob' as const;
  #plugin: AdMobPlugin | null = null;
  #units: AdUnitIds;
  #testMode: boolean;
  #ready = false;
  #rewardEarned = false;
  #appOpenReady = false;

  constructor(units: AdUnitIds, testMode: boolean) {
    this.#units = units;
    this.#testMode = testMode;
  }

  /** Charge le plugin dynamiquement ; renvoie null s'il est absent. */
  async #load(): Promise<AdMobPlugin | null> {
    if (this.#plugin) return this.#plugin;
    try {
      const pkg = '@capacitor-community/admob';
      const mod = (await import(/* @vite-ignore */ pkg)) as { AdMob?: AdMobPlugin };
      this.#plugin = mod.AdMob ?? null;
      return this.#plugin;
    } catch {
      return null; // plugin non installé : dégradation propre
    }
  }

  async initialize(): Promise<void> {
    if (this.#ready) return;
    const p = await this.#load();
    if (!p) return;
    try {
      await p.initialize({
        initializeForTesting: this.#testMode,
        testingDevices: [],
      });

      // RGPD / EEA : demander l'info de consentement et afficher le formulaire
      // s'il est requis. SANS ça, les pubs peuvent NE PAS SE CHARGER en Europe.
      try {
        const info = await p.requestConsentInfo?.({});
        if (info?.isConsentFormAvailable && (info.status === 'REQUIRED' || info.status === 'UNKNOWN')) {
          await p.showConsentForm?.();
        }
      } catch { /* pas de consent ou pas dispo */ }

      // Écoute la récompense (nom d'événement v6).
      try { await p.addListener(REWARD_EVENT_REWARDED, () => { this.#rewardEarned = true; }); } catch { /* ignore */ }

      this.#ready = true;
    } catch { /* init échouée : le fournisseur reste inerte */ }
  }

  #bannerId() { return this.#units.banner ?? ''; }

  // ── Bannière ──────────────────────────────────────────────────────────────
  async showBanner(): Promise<void> {
    const p = await this.#load(); if (!p || !this.#bannerId()) return;
    try {
      await p.showBanner({
        adId: this.#bannerId(),
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0,
        isTesting: this.#testMode,
      });
    } catch { /* indisponible */ }
  }

  async hideBanner(): Promise<void> {
    const p = await this.#load(); if (!p) return;
    try { await p.hideBanner(); } catch { /* ignore */ }
  }

  // ── Interstitiel ──────────────────────────────────────────────────────────
  async prepareInterstitial(): Promise<void> {
    const p = await this.#load(); if (!p || !this.#units.interstitial) return;
    try { await p.prepareInterstitial({ adId: this.#units.interstitial, isTesting: this.#testMode }); } catch { /* ignore */ }
  }

  async showInterstitial(): Promise<ShowResult> {
    const p = await this.#load(); if (!p || !this.#units.interstitial) return { shown: false, reason: 'unavailable' };
    try {
      await p.showInterstitial();
      void this.prepareInterstitial();
      return { shown: true };
    } catch { return { shown: false, reason: 'error' }; }
  }

  // ── Récompensée ───────────────────────────────────────────────────────────
  async prepareRewarded(): Promise<void> {
    const p = await this.#load(); if (!p || !this.#units.rewarded) return;
    try { await p.prepareRewardVideoAd({ adId: this.#units.rewarded, isTesting: this.#testMode }); } catch { /* ignore */ }
  }

  async showRewarded(): Promise<RewardResult> {
    const p = await this.#load(); if (!p) return { rewarded: false, amount: 0, reason: 'plugin-missing' };
    if (!this.#units.rewarded) return { rewarded: false, amount: 0, reason: 'unavailable' };
    this.#rewardEarned = false;

    // On précharge à chaque appel : une pub récompensée est à USAGE UNIQUE, et
    // le préchargement en tâche de fond peut ne pas être prêt au moment du clic.
    try {
      await p.prepareRewardVideoAd({ adId: this.#units.rewarded, isTesting: this.#testMode });
    } catch { return { rewarded: false, amount: 0, reason: 'unavailable' }; }

    try {
      const res = (await p.showRewardVideoAd()) as { type?: string; amount?: number } | void;
      const returned = res && typeof res === 'object';
      const amount = returned && typeof res.amount === 'number' ? res.amount : 0;
      const rewarded = this.#rewardEarned || amount > 0;
      if (rewarded) return { rewarded: true, amount };
      // Show a réussi mais aucune récompense n'a été signalée : pub fermée avant la fin.
      return { rewarded: false, amount: 0, reason: 'cancelled' };
    } catch { return { rewarded: false, amount: 0, reason: 'error' }; }
  }

  // ── App Open (API v6 : loadAppOpen / isAppOpenLoaded / showAppOpen) ───────
  async prepareAppOpen(): Promise<void> {
    const p = await this.#load(); if (!p?.loadAppOpen || !this.#units.appOpen) return;
    this.#appOpenReady = false;
    try {
      await p.loadAppOpen({ adId: this.#units.appOpen, isTesting: this.#testMode });
      const status = await p.isAppOpenLoaded?.();
      const ready = typeof status === 'boolean' ? status : status?.value === true;
      this.#appOpenReady = !!ready;
    } catch { /* ignore */ }
  }

  async showAppOpen(): Promise<ShowResult> {
    const p = await this.#load(); if (!p?.showAppOpen || !this.#units.appOpen) return { shown: false, reason: 'unavailable' };
    if (!this.#appOpenReady) await this.prepareAppOpen();
    if (!this.#appOpenReady) return { shown: false, reason: 'unavailable' };
    try {
      await p.showAppOpen();
      this.#appOpenReady = false;
      void this.prepareAppOpen();
      return { shown: true };
    } catch { return { shown: false, reason: 'error' }; }
  }

  /** Plateforme courante (diagnostic). */
  get platform() { return getPlatform(); }
}
