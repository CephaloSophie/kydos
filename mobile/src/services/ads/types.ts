/* =============================================================================
 * ADS · types.ts — Contrats du module publicité (indépendants du fournisseur).
 * -----------------------------------------------------------------------------
 * Toute l'application ne dépend QUE de ces types, jamais d'un SDK concret. Le
 * choix du réseau (AdMob, AppLovin, Unity, Meta…) se fait dans la configuration
 * (adConfig.ts) et se branche via le registre de fournisseurs (registry.ts).
 * ========================================================================== */

/** Réseaux publicitaires pris en charge (top 4 + fournisseur nul pour le dev). */
export type AdNetwork = 'admob' | 'applovin' | 'unity' | 'meta' | 'none';

/** Formats publicitaires gérés. */
export type AdFormat = 'banner' | 'interstitial' | 'rewarded' | 'appOpen';

/** Emplacements métier (où/quand une pub apparaît). Découplé du format. */
export type AdPlacement =
  | 'banner-home'            // bannière adaptive, bas de l'écran (hors table)
  | 'reward-daily'           // récompense quotidienne / +100 jetons par visionnage
  | 'interstitial-postgame'  // après chaque partie
  | 'interstitial-create-table' // avant de créer une table
  | 'interstitial-launch-saved' // avant de lancer une partie sauvegardée
  | 'appopen-training'       // avant une partie d'entraînement
  | 'appopen-resume';        // reprise app après 3 min de navigation (hors table)

/** Identifiants d'unités publicitaires par format, pour un réseau donné. */
export interface AdUnitIds {
  banner?: string;
  interstitial?: string;
  rewarded?: string;
  appOpen?: string;
}

/** Résultat d'un affichage de pub récompensée. */
export interface RewardResult {
  /** L'utilisateur a-t-il regardé la pub jusqu'au bout (récompense méritée) ? */
  rewarded: boolean;
  /** Montant crédité (jetons), 0 si non récompensé. */
  amount: number;
  /** Raison si non récompensé (diagnostic UX). */
  reason?: 'vip' | 'unavailable' | 'not-native' | 'plugin-missing' | 'error' | 'cancelled';
}

/** Résultat générique d'un affichage plein écran (interstitiel / app open). */
export interface ShowResult {
  /** La pub a-t-elle été montrée (false = indisponible, ignorée, ou VIP). */
  shown: boolean;
  /** Raison si non montrée (utile pour les logs / analytics). */
  reason?: 'vip' | 'unavailable' | 'not-native' | 'frequency-capped' | 'disabled' | 'error';
}

/** Événements émis par le module (branchés sur l'EventBus applicatif). */
export interface AdEvents {
  'ads:banner-loaded': { network: AdNetwork };
  'ads:banner-failed': { network: AdNetwork; error: string };
  'ads:reward-granted': { amount: number };
  'ads:interstitial-shown': { placement: AdPlacement };
  'ads:appopen-shown': { placement: AdPlacement };
  'ads:vip-changed': { isVip: boolean };
}

/**
 * Contrat que CHAQUE fournisseur publicitaire doit implémenter. Volontairement
 * minimal : la logique métier (VIP, fréquence, emplacements) vit dans AdManager,
 * pas ici. Un fournisseur ne sait QUE charger/afficher un format.
 */
export interface AdProvider {
  readonly network: AdNetwork;

  /** Initialise le SDK natif (idempotent). Résout même si non natif (no-op). */
  initialize(): Promise<void>;

  /** Affiche/masque la bannière adaptive (emplacement unique, bas de l'écran). */
  showBanner(): Promise<void>;
  hideBanner(): Promise<void>;

  /** Précharge un interstitiel (optionnel : certains réseaux le font seuls). */
  prepareInterstitial(): Promise<void>;
  /** Affiche un interstitiel s'il est prêt. */
  showInterstitial(): Promise<ShowResult>;

  /** Précharge une pub récompensée. */
  prepareRewarded(): Promise<void>;
  /** Affiche la pub récompensée et renvoie si la récompense est méritée. */
  showRewarded(): Promise<RewardResult>;

  /** Précharge une pub App Open. */
  prepareAppOpen(): Promise<void>;
  /** Affiche la pub App Open si prête. */
  showAppOpen(): Promise<ShowResult>;
}
