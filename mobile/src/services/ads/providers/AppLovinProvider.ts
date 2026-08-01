/* =============================================================================
 * ADS · providers/AppLovinProvider.ts — Fournisseur AppLovin MAX.
 * -----------------------------------------------------------------------------
 * Bridge (dépendance douce) vers un plugin AppLovin MAX Capacitor. AppLovin est
 * une plateforme de MÉDIATION : les unit IDs sont des "ad unit identifiers" MAX.
 * Renseignez la SDK key native (AndroidManifest / Info.plist) — voir docs/ADS.md.
 * ========================================================================== */
import type { AdUnitIds, RewardResult, ShowResult } from '../types';
import { NativePluginProvider } from './NativePluginProvider';

interface AppLovinPlugin {
  initialize(opts?: unknown): Promise<void>;
  showBanner(opts: unknown): Promise<void>;
  hideBanner(opts?: unknown): Promise<void>;
  loadInterstitial(opts: unknown): Promise<void>;
  showInterstitial(opts: unknown): Promise<void>;
  loadRewardedAd(opts: unknown): Promise<void>;
  showRewardedAd(opts: unknown): Promise<{ rewarded?: boolean; amount?: number }>;
  loadAppOpenAd?(opts: unknown): Promise<void>;
  showAppOpenAd?(opts: unknown): Promise<void>;
}

export class AppLovinProvider extends NativePluginProvider<AppLovinPlugin> {
  readonly network = 'applovin' as const;
  protected readonly packageName = 'capacitor-applovin-max';
  protected pick(mod: unknown) { return (mod as { AppLovinMAX?: AppLovinPlugin }).AppLovinMAX ?? null; }

  #units: AdUnitIds;
  constructor(units: AdUnitIds) { super(); this.#units = units; }

  async initialize(): Promise<void> {
    if (this.ready) return;
    const p = await this.load(); if (!p) return;
    try { await p.initialize(); this.ready = true; } catch { /* inerte */ }
  }

  async showBanner(): Promise<void> {
    const p = await this.load(); if (!p || !this.#units.banner) return;
    try { await p.showBanner({ adUnitId: this.#units.banner, position: 'bottom_center' }); } catch { /* ignore */ }
  }
  async hideBanner(): Promise<void> {
    const p = await this.load(); if (!p || !this.#units.banner) return;
    try { await p.hideBanner({ adUnitId: this.#units.banner }); } catch { /* ignore */ }
  }
  async prepareInterstitial(): Promise<void> {
    const p = await this.load(); if (!p || !this.#units.interstitial) return;
    try { await p.loadInterstitial({ adUnitId: this.#units.interstitial }); } catch { /* ignore */ }
  }
  async showInterstitial(): Promise<ShowResult> {
    const p = await this.load(); if (!p || !this.#units.interstitial) return { shown: false, reason: 'unavailable' };
    try { await p.showInterstitial({ adUnitId: this.#units.interstitial }); void this.prepareInterstitial(); return { shown: true }; }
    catch { return { shown: false, reason: 'error' }; }
  }
  async prepareRewarded(): Promise<void> {
    const p = await this.load(); if (!p || !this.#units.rewarded) return;
    try { await p.loadRewardedAd({ adUnitId: this.#units.rewarded }); } catch { /* ignore */ }
  }
  async showRewarded(): Promise<RewardResult> {
    const p = await this.load(); if (!p || !this.#units.rewarded) return { rewarded: false, amount: 0 };
    try {
      const r = await p.showRewardedAd({ adUnitId: this.#units.rewarded });
      void this.prepareRewarded();
      return { rewarded: r?.rewarded === true, amount: r?.rewarded ? (r.amount ?? 0) : 0 };
    } catch { return { rewarded: false, amount: 0 }; }
  }
  async prepareAppOpen(): Promise<void> {
    const p = await this.load(); if (!p?.loadAppOpenAd || !this.#units.appOpen) return;
    try { await p.loadAppOpenAd({ adUnitId: this.#units.appOpen }); } catch { /* ignore */ }
  }
  async showAppOpen(): Promise<ShowResult> {
    const p = await this.load(); if (!p?.showAppOpenAd || !this.#units.appOpen) return { shown: false, reason: 'unavailable' };
    try { await p.showAppOpenAd({ adUnitId: this.#units.appOpen }); void this.prepareAppOpen(); return { shown: true }; }
    catch { return { shown: false, reason: 'error' }; }
  }
}
