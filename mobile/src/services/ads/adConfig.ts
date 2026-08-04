/* =============================================================================
 * ADS · adConfig.ts — LE fichier à éditer pour la publicité.
 * -----------------------------------------------------------------------------
 * Changer de fournisseur = changer `ACTIVE_NETWORK`. Régler les identifiants
 * d'unités = éditer `AD_UNITS`. Aucun autre fichier à toucher : le registre
 * instancie le bon fournisseur et l'AdManager applique les règles métier.
 *
 * Les 4 réseaux majeurs sont pré-câblés (voir providers/). Par défaut : AdMob.
 * ========================================================================== */
import type { AdNetwork, AdUnitIds } from './types';

/** Réseau publicitaire ACTIF. Changez cette seule ligne pour switcher. */
export const ACTIVE_NETWORK: AdNetwork = 'admob';

/**
 * Mode test : utilise les identifiants de test officiels des SDK et n'affiche
 * jamais de vraies pubs (évite les invalidations de compte en développement).
 * Passez à false pour la production APRÈS avoir renseigné vos vrais unit IDs.
 */
export const TEST_MODE = true;

/**
 * Identifiants d'unités par réseau et par format. Renseignez ceux de votre
 * compte pour le réseau ACTIF. Les valeurs ci-dessous pour AdMob sont les
 * identifiants de TEST publics de Google (sûrs en développement).
 */
export const AD_UNITS: Record<AdNetwork, { android: AdUnitIds; ios: AdUnitIds }> = {
  admob: {
    android: {
      banner: 'ca-app-pub-3940256099942544/6300978111',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
      rewarded: 'ca-app-pub-3940256099942544/5224354917',
      appOpen: 'ca-app-pub-3940256099942544/9257395921',
    },
    ios: {
      banner: 'ca-app-pub-3940256099942544/2934735716',
      interstitial: 'ca-app-pub-3940256099942544/4411468910',
      rewarded: 'ca-app-pub-3940256099942544/1712485313',
      appOpen: 'ca-app-pub-3940256099942544/5575463023',
    },
  },
  applovin: {
    android: { banner: '', interstitial: '', rewarded: '', appOpen: '' },
    ios: { banner: '', interstitial: '', rewarded: '', appOpen: '' },
  },
  unity: {
    // Unity : "unit IDs" = noms de placements. gameId se met dans le provider.
    android: { banner: 'Banner_Android', interstitial: 'Interstitial_Android', rewarded: 'Rewarded_Android', appOpen: 'AppOpen_Android' },
    ios: { banner: 'Banner_iOS', interstitial: 'Interstitial_iOS', rewarded: 'Rewarded_iOS', appOpen: 'AppOpen_iOS' },
  },
  meta: {
    android: { banner: '', interstitial: '', rewarded: '', appOpen: '' },
    ios: { banner: '', interstitial: '', rewarded: '', appOpen: '' },
  },
  none: {
    android: {}, ios: {},
  },
};

/** Réglages généraux du module publicité. */
export const AD_SETTINGS = {
  /** Rafraîchissement automatique de la bannière (ms). */
  bannerRefreshMs: 60_000,
  /** Récompense (jetons) par visionnage supplémentaire une fois le quotidien pris. */
  extraRewardTokens: 100,
  /** Récompense quotidienne (jetons) via pub récompensée. */
  dailyRewardTokens: 500,
  /** Délai de navigation (hors table) avant qu'une App Open soit prête (ms). */
  appOpenResumeAfterMs: 3 * 60_000,
  /** Anti-spam : intervalle minimal entre deux interstitiels (ms). */
  interstitialMinGapMs: 45_000,
  /** Clé Unity (gameId) — requise si ACTIVE_NETWORK = 'unity'. */
  unityGameId: { android: '', ios: '' },
  /**
   * Identifiants de DEVICES de test (Android) pour AdMob.
   * Trouver le tien : `adb logcat | grep "Use RequestConfiguration.Builder"` sur
   * ton device en dev — AdMob affiche l'ID à ajouter ici pour que TES device(s)
   * reçoivent des pubs de test même en TEST_MODE=false / prod.
   */
  admobTestDeviceIds: [] as string[],
} as const;
