/* =============================================================================
 * ADS · providers/AdMobProvider.ts — Fournisseur Google AdMob (DÉFAUT).
 * -----------------------------------------------------------------------------
 * Bridge vers le plugin natif @capacitor-community/admob. La dépendance est
 * DOUCE : importée dynamiquement à l'initialisation, de sorte que l'application
 * COMPILE et FONCTIONNE même si le plugin n'est pas installé (web, tests). Si le
 * plugin est absent au runtime natif, le fournisseur se comporte comme le
 * fournisseur nul (aucune pub) plutôt que de planter.
 *
 * Installation native (voir docs/ADS.md) :
 *   npm i @capacitor-community/admob
 *   npx cap sync
 * puis renseigner l'App ID AdMob dans AndroidManifest.xml / Info.plist.
 * ========================================================================== */
import type { AdProvider, AdUnitIds, RewardResult, ShowResult } from '../types';
import { getPlatform } from '../platform';

/* Types minimaux du plugin (évite d'exiger le package à la compilation). */
interface AdMobPlugin {
  initialize(opts?: unknown): Promise<void>;
  showBanner(opts: unknown): Promise<void>;
  hideBanner(): Promise<void>;
  removeBanner(): Promise<void>;
  prepareInterstitial(opts: unknown): Promise<void>;
  showInterstitial(): Promise<void>;
  prepareRewardVideoAd(opts: unknown): Promise<void>;
  showRewardVideoAd(): Promise<{ type?: string; amount?: number }>;
  addListener(event: string, cb: (info: unknown) => void): Promise<unknown> | unknown;
}

export class AdMobProvider implements AdProvider {
  readonly network = 'admob' as const;
  #plugin: AdMobPlugin | null = null;
  #units: AdUnitIds;
  #testMode: boolean;
  #ready = false;
  #rewardEarned = false;

  constructor(units: AdUnitIds, testMode: boolean) {
    this.#units = units;
    this.#testMode = testMode;
  }

  /** Charge le plugin dynamiquement ; renvoie null s'il est absent. */
  async #load(): Promise<AdMobPlugin | null> {
    if (this.#plugin) return this.#plugin;
    try {
      // Import dynamique par variable pour que le bundler ne l'exige pas.
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
      await p.initialize({ initializeForTesting: this.#testMode });
      // Suivi de la récompense via l'événement natif dédié.
      await p.addListener('onRewardedVideoAdReward', () => { this.#rewardEarned = true; });
      this.#ready = true;
    } catch { /* init échouée : le fournisseur reste inerte */ }
  }

  #bannerId() { return this.#units.banner ?? ''; }

  async showBanner(): Promise<void> {
    const p = await this.#load(); if (!p || !this.#bannerId()) return;
    try {
      await p.showBanner({
        adId: this.#bannerId(),
        // Bannière ADAPTIVE ancrée en bas ; l'alignement gauche est géré par la
        // marge native / le conteneur — AdMob ancre en bas de l'écran.
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

  async prepareInterstitial(): Promise<void> {
    const p = await this.#load(); if (!p || !this.#units.interstitial) return;
    try { await p.prepareInterstitial({ adId: this.#units.interstitial, isTesting: this.#testMode }); } catch { /* ignore */ }
  }

  async showInterstitial(): Promise<ShowResult> {
    const p = await this.#load(); if (!p || !this.#units.interstitial) return { shown: false, reason: 'unavailable' };
    try {
      await p.showInterstitial();
      void this.prepareInterstitial(); // recharge la suivante
      return { shown: true };
    } catch { return { shown: false, reason: 'error' }; }
  }

  async prepareRewarded(): Promise<void> {
    const p = await this.#load(); if (!p || !this.#units.rewarded) return;
    try { await p.prepareRewardVideoAd({ adId: this.#units.rewarded, isTesting: this.#testMode }); } catch { /* ignore */ }
  }

  async showRewarded(): Promise<RewardResult> {
    const p = await this.#load(); if (!p || !this.#units.rewarded) return { rewarded: false, amount: 0 };
    this.#rewardEarned = false;
    try {
      const res = await p.showRewardVideoAd();
      void this.prepareRewarded();
      // Certaines versions renvoient {type, amount} ; sinon on lit l'événement.
      const rewarded = this.#rewardEarned || (typeof res?.amount === 'number' && res.amount > 0);
      return { rewarded, amount: rewarded ? (res?.amount ?? 0) : 0 };
    } catch { return { rewarded: false, amount: 0 }; }
  }

  // AdMob traite l'App Open via une API dédiée selon les versions du plugin ;
  // on tente prepare/show et on dégrade proprement si non exposé.
  async prepareAppOpen(): Promise<void> {
    const p = await this.#load() as (AdMobPlugin & { prepareAppOpen?: (o: unknown) => Promise<void> }) | null;
    if (!p?.prepareAppOpen || !this.#units.appOpen) return;
    try { await p.prepareAppOpen({ adId: this.#units.appOpen, isTesting: this.#testMode }); } catch { /* ignore */ }
  }

  async showAppOpen(): Promise<ShowResult> {
    const p = await this.#load() as (AdMobPlugin & { showAppOpen?: () => Promise<void> }) | null;
    if (!p?.showAppOpen || !this.#units.appOpen) return { shown: false, reason: 'unavailable' };
    try { await p.showAppOpen(); void this.prepareAppOpen(); return { shown: true }; }
    catch { return { shown: false, reason: 'error' }; }
  }

  /** Plateforme courante (diagnostic). */
  get platform() { return getPlatform(); }
}
