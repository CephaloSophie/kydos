/* =============================================================================
 * ADS · providers/NativePluginProvider.ts — Base des fournisseurs natifs.
 * -----------------------------------------------------------------------------
 * Mutualise le chargement DOUX d'un plugin Capacitor (import dynamique, échec
 * silencieux si absent) et fournit des implémentations par défaut inertes. Les
 * fournisseurs concrets (AppLovin, Unity, Meta) surchargent uniquement ce qui
 * diffère. AdMob n'hérite PAS de cette base : son API plugin est spécifique et
 * mérite une implémentation dédiée et complète.
 * ========================================================================== */
import type { AdProvider, AdNetwork, RewardResult, ShowResult } from '../types';

export abstract class NativePluginProvider<TPlugin> implements AdProvider {
  abstract readonly network: AdNetwork;
  protected plugin: TPlugin | null = null;
  protected ready = false;
  /** Nom du package npm du plugin (importé dynamiquement). */
  protected abstract readonly packageName: string;
  /** Extrait l'objet plugin du module importé. */
  protected abstract pick(mod: unknown): TPlugin | null;

  protected async load(): Promise<TPlugin | null> {
    if (this.plugin) return this.plugin;
    try {
      const pkg = this.packageName;
      const mod = await import(/* @vite-ignore */ pkg);
      this.plugin = this.pick(mod);
      return this.plugin;
    } catch {
      return null; // plugin non installé : dégradation propre
    }
  }

  abstract initialize(): Promise<void>;

  // Implémentations par défaut inertes — surchargées au besoin.
  async showBanner(): Promise<void> { /* override */ }
  async hideBanner(): Promise<void> { /* override */ }
  async prepareInterstitial(): Promise<void> { /* override */ }
  async showInterstitial(): Promise<ShowResult> { return { shown: false, reason: 'unavailable' }; }
  async prepareRewarded(): Promise<void> { /* override */ }
  async showRewarded(): Promise<RewardResult> { return { rewarded: false, amount: 0 }; }
  async prepareAppOpen(): Promise<void> { /* override */ }
  async showAppOpen(): Promise<ShowResult> { return { shown: false, reason: 'unavailable' }; }
}
