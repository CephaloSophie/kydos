/* =============================================================================
 * ADS · providers/MetaProvider.ts — Fournisseur Meta Audience Network.
 * -----------------------------------------------------------------------------
 * Bridge (dépendance douce) vers un plugin Meta Audience Network Capacitor. Les
 * unit IDs sont des "placement IDs" Meta. Audience Network n'expose pas d'App
 * Open : ce format retombe proprement en indisponible. Voir docs/ADS.md.
 * ========================================================================== */
import type { AdUnitIds, RewardResult, ShowResult } from '../types';
import { NativePluginProvider } from './NativePluginProvider';

interface MetaPlugin {
  initialize(opts?: unknown): Promise<void>;
  showBanner(opts: unknown): Promise<void>;
  hideBanner(opts?: unknown): Promise<void>;
  loadInterstitial(opts: unknown): Promise<void>;
  showInterstitial(opts: unknown): Promise<void>;
  loadRewarded(opts: unknown): Promise<void>;
  showRewarded(opts: unknown): Promise<{ rewarded?: boolean }>;
}

export class MetaProvider extends NativePluginProvider<MetaPlugin> {
  readonly network = 'meta' as const;
  protected readonly packageName = 'capacitor-meta-audience-network';
  protected pick(mod: unknown) { return (mod as { MetaAudienceNetwork?: MetaPlugin }).MetaAudienceNetwork ?? null; }

  #units: AdUnitIds;
  constructor(units: AdUnitIds) { super(); this.#units = units; }

  async initialize(): Promise<void> {
    if (this.ready) return;
    const p = await this.load(); if (!p) return;
    try { await p.initialize(); this.ready = true; } catch { /* inerte */ }
  }
  async showBanner(): Promise<void> {
    const p = await this.load(); if (!p || !this.#units.banner) return;
    try { await p.showBanner({ placementId: this.#units.banner, position: 'bottom' }); } catch { /* ignore */ }
  }
  async hideBanner(): Promise<void> {
    const p = await this.load(); if (!p) return;
    try { await p.hideBanner(); } catch { /* ignore */ }
  }
  async prepareInterstitial(): Promise<void> {
    const p = await this.load(); if (!p || !this.#units.interstitial) return;
    try { await p.loadInterstitial({ placementId: this.#units.interstitial }); } catch { /* ignore */ }
  }
  async showInterstitial(): Promise<ShowResult> {
    const p = await this.load(); if (!p || !this.#units.interstitial) return { shown: false, reason: 'unavailable' };
    try { await p.showInterstitial({ placementId: this.#units.interstitial }); void this.prepareInterstitial(); return { shown: true }; }
    catch { return { shown: false, reason: 'error' }; }
  }
  async prepareRewarded(): Promise<void> {
    const p = await this.load(); if (!p || !this.#units.rewarded) return;
    try { await p.loadRewarded({ placementId: this.#units.rewarded }); } catch { /* ignore */ }
  }
  async showRewarded(): Promise<RewardResult> {
    const p = await this.load(); if (!p || !this.#units.rewarded) return { rewarded: false, amount: 0 };
    try {
      const r = await p.showRewarded({ placementId: this.#units.rewarded });
      void this.prepareRewarded();
      return { rewarded: r?.rewarded === true, amount: 0 };
    } catch { return { rewarded: false, amount: 0 }; }
  }
  // Meta Audience Network : pas d'App Open → indisponible (hérité de la base).
}
