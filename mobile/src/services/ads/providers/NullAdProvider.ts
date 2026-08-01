/* =============================================================================
 * ADS · providers/NullAdProvider.ts — Fournisseur « aucune publicité ».
 * -----------------------------------------------------------------------------
 * Utilisé en web, en développement et dans les tests (aucun SDK natif). Respecte
 * intégralement le contrat AdProvider mais n'affiche rien. Les pubs récompensées
 * renvoient une récompense « méritée » afin que le PARCOURS reste testable en
 * dev (l'utilisateur n'est pas bloqué faute de SDK) — en production, un vrai
 * fournisseur natif prend le relais.
 * ========================================================================== */
import type { AdProvider, RewardResult, ShowResult } from '../types';

export class NullAdProvider implements AdProvider {
  readonly network = 'none' as const;

  async initialize(): Promise<void> { /* rien à initialiser */ }

  async showBanner(): Promise<void> { /* pas de bannière en web */ }
  async hideBanner(): Promise<void> { /* idem */ }

  async prepareInterstitial(): Promise<void> { /* pas de préchargement */ }
  async showInterstitial(): Promise<ShowResult> { return { shown: false, reason: 'not-native' }; }

  async prepareRewarded(): Promise<void> { /* pas de préchargement */ }
  async showRewarded(): Promise<RewardResult> {
    // En dev, on considère la récompense obtenue pour ne pas bloquer le parcours.
    return { rewarded: true, amount: 0 };
  }

  async prepareAppOpen(): Promise<void> { /* pas de préchargement */ }
  async showAppOpen(): Promise<ShowResult> { return { shown: false, reason: 'not-native' }; }
}
