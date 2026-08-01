/* =============================================================================
 * ADS · index.ts — API publique du module publicité.
 * -----------------------------------------------------------------------------
 * Les écrans importent depuis ici. Rien d'autre du module n'est « public ».
 * ========================================================================== */
export { AdManager } from './AdManager';
export type { AdManagerDeps } from './AdManager';
export { VipService, VIP_PLANS } from './VipService';
export type { VipPlan, VipStatus, VipApi } from './VipService';
export { createAdProvider } from './registry';
export { ACTIVE_NETWORK, AD_SETTINGS } from './adConfig';
export type { AdNetwork, AdFormat, AdPlacement, AdProvider, RewardResult, ShowResult } from './types';
