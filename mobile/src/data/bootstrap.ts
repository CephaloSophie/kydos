/* =============================================================================
 * DATA · bootstrap.ts — Séquence de démarrage de l'application.
 * -----------------------------------------------------------------------------
 * Orchestre le chargement initial des données de session et des sons pendant
 * que la page « waiting » (les 4 robots qui dansent) est affichée.
 *
 * Objectif : après ce bootstrap, l'app dispose EN MÉMOIRE de profil + wallet +
 * VIP + robots + tous les sons. Les écrans lisent ensuite ces données depuis
 * le cache (aucun aller-retour serveur au clic), et le mode solo fonctionne
 * hors-ligne dès la 2ᵉ ouverture.
 *
 * Robustesse : chaque étape est tolérante à l'échec (Promise.allSettled). Si
 * le réseau est absent mais qu'un cache persisté existe, l'app démarre quand
 * même avec les dernières valeurs connues.
 * ========================================================================== */
import type { SessionCache } from './SessionCache';
import type { SoundService } from '../services/sound/SoundService';
import type { ApiClient } from './ApiClient';

export interface BootstrapDeps {
  api: ApiClient;
  session: SessionCache;
  sound: SoundService;
}

/**
 * Charge les données de session + précharge tous les sons.
 * Ne lève jamais : en cas d'échec réseau, on repart sur le cache persisté.
 *
 * @returns un résumé indiquant ce qui a pu être chargé (utile pour décider de
 *          l'écran de destination et pour le diagnostic).
 */
export async function runBootstrap(deps: BootstrapDeps): Promise<{
  authenticated: boolean;
  sessionLoaded: boolean;
  soundsPreloaded: boolean;
}> {
  const authenticated = deps.api.isAuthenticated();

  // Non authentifié : rien à charger côté session. On précharge tout de même
  // les sons (utile pour la démo hors-ligne / première partie après login).
  if (!authenticated) {
    let soundsPreloaded = false;
    try { await deps.sound.preloadAll(); soundsPreloaded = true; } catch { /* sons optionnels */ }
    return { authenticated: false, sessionLoaded: false, soundsPreloaded };
  }

  // Authentifié : session + sons en parallèle.
  const [sessionResult, soundResult] = await Promise.allSettled([
    deps.session.loadAll(),
    deps.sound.preloadAll(),
  ]);

  return {
    authenticated: true,
    sessionLoaded: sessionResult.status === 'fulfilled' && deps.session.hydrated,
    soundsPreloaded: soundResult.status === 'fulfilled',
  };
}
