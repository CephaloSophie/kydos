/* =============================================================================
 * ADS · registry.ts — Fabrique de fournisseurs publicitaires.
 * -----------------------------------------------------------------------------
 * Traduit la CONFIGURATION (adConfig) en une instance d'AdProvider concrète.
 * C'est le SEUL endroit qui connaît tous les fournisseurs : ajouter un réseau =
 * une entrée ici + un fichier dans providers/. Le reste de l'app ne voit que
 * l'interface AdProvider.
 * ========================================================================== */
import type { AdProvider, AdNetwork } from './types';
import { ACTIVE_NETWORK, AD_UNITS, AD_SETTINGS, TEST_MODE } from './adConfig';
import { getPlatform, isNativePlatform } from './platform';
import { NullAdProvider } from './providers/NullAdProvider';
import { AdMobProvider } from './providers/AdMobProvider';
import { AppLovinProvider } from './providers/AppLovinProvider';
import { UnityProvider } from './providers/UnityProvider';
import { MetaProvider } from './providers/MetaProvider';

/** Unit IDs du réseau pour la plateforme courante. */
function unitsFor(network: AdNetwork) {
  const perPlatform = AD_UNITS[network];
  return getPlatform() === 'ios' ? perPlatform.ios : perPlatform.android;
}

/**
 * Construit le fournisseur configuré. En environnement NON natif (web, tests),
 * on force le fournisseur nul : aucun SDK publicitaire n'existe hors device.
 */
export function createAdProvider(network: AdNetwork = ACTIVE_NETWORK): AdProvider {
  if (!isNativePlatform() || network === 'none') return new NullAdProvider();

  const units = unitsFor(network);
  switch (network) {
    case 'admob':    return new AdMobProvider(units, TEST_MODE);
    case 'applovin': return new AppLovinProvider(units);
    case 'unity':    return new UnityProvider(units, AD_SETTINGS.unityGameId, TEST_MODE);
    case 'meta':     return new MetaProvider(units);
    default:         return new NullAdProvider();
  }
}
