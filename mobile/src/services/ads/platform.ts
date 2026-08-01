/* =============================================================================
 * ADS · platform.ts — Détection de plateforme (Capacitor natif vs web).
 * -----------------------------------------------------------------------------
 * Les SDK publicitaires n'existent QUE sur natif (Android/iOS). En web (dev,
 * navigateur, tests) on retombe sur le fournisseur nul. On lit `window.Capacitor`
 * sans importer @capacitor/core en dur : le module reste testable et n'échoue
 * pas si Capacitor n'est pas présent.
 * ========================================================================== */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function cap(): CapacitorGlobal | undefined {
  return (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** Vrai sur un device/simulateur natif ; faux en navigateur web et en test. */
export function isNativePlatform(): boolean {
  try { return cap()?.isNativePlatform?.() === true; } catch { return false; }
}

/** 'android' | 'ios' | 'web'. */
export function getPlatform(): 'android' | 'ios' | 'web' {
  try {
    const p = cap()?.getPlatform?.();
    return p === 'android' || p === 'ios' ? p : 'web';
  } catch { return 'web'; }
}
