/* =============================================================================
 * ADS · providers/UnityProvider.ts — Fournisseur Unity Ads.
 * -----------------------------------------------------------------------------
 * Bridge (dépendance douce) vers un plugin Unity Ads Capacitor. Unity identifie
 * les pubs par des NOMS DE PLACEMENT (pas des unit IDs) et requiert un gameId
 * par plateforme (renseigné dans AD_SETTINGS.unityGameId). Voir docs/ADS.md.
 * ========================================================================== */
import type { AdUnitIds, RewardResult, ShowResult } from '../types';
import { NativePluginProvider } from './NativePluginProvider';
import { getPlatform } from '../platform';

interface UnityPlugin {
  initialize(opts: unknown): Promise<void>;
  banner(opts: unknown): Promise<void>;
  bannerHide?(opts?: unknown): Promise<void>;
  load(opts: unknown): Promise<void>;
  show(opts: unknown): Promise<{ state?: string }>;
}

export class UnityProvider extends NativePluginProvider<UnityPlugin> {
  readonly network = 'unity' as const;
  protected readonly packageName = 'capacitor-unity-ads';
  protected pick(mod: unknown) { return (mod as { UnityAds?: UnityPlugin }).UnityAds ?? null; }

  #placements: AdUnitIds;
  #gameId: { android: string; ios: string };
  #testMode: boolean;
  constructor(placements: AdUnitIds, gameId: { android: string; ios: string }, testMode: boolean) {
    super(); this.#placements = placements; this.#gameId = gameId; this.#testMode = testMode;
  }

  #gid() { return getPlatform() === 'ios' ? this.#gameId.ios : this.#gameId.android; }

  async initialize(): Promise<void> {
    if (this.ready) return;
    const p = await this.load(); if (!p || !this.#gid()) return;
    try { await p.initialize({ gameId: this.#gid(), testMode: this.#testMode }); this.ready = true; } catch { /* inerte */ }
  }
  async showBanner(): Promise<void> {
    const p = await this.load(); if (!p || !this.#placements.banner) return;
    try { await p.banner({ placementId: this.#placements.banner, position: 'BOTTOM_CENTER' }); } catch { /* ignore */ }
  }
  async hideBanner(): Promise<void> {
    const p = await this.load(); if (!p?.bannerHide) return;
    try { await p.bannerHide(); } catch { /* ignore */ }
  }
  async prepareInterstitial(): Promise<void> {
    const p = await this.load(); if (!p || !this.#placements.interstitial) return;
    try { await p.load({ placementId: this.#placements.interstitial }); } catch { /* ignore */ }
  }
  async showInterstitial(): Promise<ShowResult> {
    const p = await this.load(); if (!p || !this.#placements.interstitial) return { shown: false, reason: 'unavailable' };
    try { await p.show({ placementId: this.#placements.interstitial }); void this.prepareInterstitial(); return { shown: true }; }
    catch { return { shown: false, reason: 'error' }; }
  }
  async prepareRewarded(): Promise<void> {
    const p = await this.load(); if (!p || !this.#placements.rewarded) return;
    try { await p.load({ placementId: this.#placements.rewarded }); } catch { /* ignore */ }
  }
  async showRewarded(): Promise<RewardResult> {
    const p = await this.load(); if (!p || !this.#placements.rewarded) return { rewarded: false, amount: 0 };
    try {
      const r = await p.show({ placementId: this.#placements.rewarded });
      void this.prepareRewarded();
      // Unity : state 'COMPLETED' = récompense méritée.
      return { rewarded: r?.state === 'COMPLETED', amount: 0 };
    } catch { return { rewarded: false, amount: 0 }; }
  }
  async prepareAppOpen(): Promise<void> {
    const p = await this.load(); if (!p || !this.#placements.appOpen) return;
    try { await p.load({ placementId: this.#placements.appOpen }); } catch { /* ignore */ }
  }
  async showAppOpen(): Promise<ShowResult> {
    const p = await this.load(); if (!p || !this.#placements.appOpen) return { shown: false, reason: 'unavailable' };
    try { await p.show({ placementId: this.#placements.appOpen }); void this.prepareAppOpen(); return { shown: true }; }
    catch { return { shown: false, reason: 'error' }; }
  }
}
