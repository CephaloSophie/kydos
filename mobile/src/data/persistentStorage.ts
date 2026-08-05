/* =============================================================================
 * DATA · persistentStorage.ts — Stockage persistant cross-platform.
 * -----------------------------------------------------------------------------
 * Abstraction unique au-dessus de localStorage. Fonctionne à l'IDENTIQUE sur :
 *   • Web (navigateur)              → localStorage natif
 *   • APK/iOS (Capacitor WebView)   → localStorage du WebView, PERSISTANT
 *     (survit aux redémarrages de l'app, isolé par application).
 *
 * Pourquoi pas @capacitor/preferences ? localStorage est déjà persistant dans
 * le WebView Capacitor (stocké dans les données de l'app, effacé seulement à
 * la désinstallation). Rester sur localStorage évite une dépendance native
 * supplémentaire tout en gardant un point d'abstraction unique : si un jour on
 * veut du chiffrement natif (SecureStorage), on ne change QUE ce fichier.
 *
 * SÉCURITÉ : ce module ne stocke QUE des données déjà connues du serveur
 * (profil public, solde, expiration VIP, fiches robots). Le serveur reste
 * l'autorité — le cache est un miroir accéléré, jamais une source de vérité
 * pour une décision sensible (débit, achat). Aucun secret n'y est écrit :
 * le jeton d'authentification garde sa propre clé gérée par l'ApiClient.
 *
 * INTÉGRITÉ : chaque entrée est enveloppée avec un numéro de version de schéma
 * et un horodatage. Une entrée d'une version antérieure est ignorée (traitée
 * comme absente) plutôt que de risquer un plantage sur un format incompatible.
 * ========================================================================== */

const NAMESPACE = 'kydos';
const SCHEMA_VERSION = 1;

interface Envelope<T> {
  v: number;      // version de schéma
  at: number;     // horodatage d'écriture (ms epoch)
  data: T;
}

/** Construit la clé complète namespacée. */
function fullKey(key: string): string { return `${NAMESPACE}.cache.${key}`; }

/** Écrit une valeur (sérialisée + enveloppée). Silencieux si le stockage est indispo. */
export function persistSet<T>(key: string, data: T): void {
  try {
    const env: Envelope<T> = { v: SCHEMA_VERSION, at: Date.now(), data };
    localStorage.setItem(fullKey(key), JSON.stringify(env));
  } catch { /* quota plein ou stockage désactivé : on ignore, le serveur reste l'autorité */ }
}

/**
 * Lit une valeur. Retourne `null` si absente, illisible, ou d'une version de
 * schéma incompatible. `maxAgeMs` optionnel : au-delà, l'entrée est considérée
 * périmée (retourne null) — utile pour forcer un refresh de données volatiles.
 */
export function persistGet<T>(key: string, maxAgeMs?: number): T | null {
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || env.v !== SCHEMA_VERSION) return null;
    if (maxAgeMs !== undefined && Date.now() - env.at > maxAgeMs) return null;
    return env.data;
  } catch { return null; }
}

/** Horodatage d'écriture d'une entrée (ms epoch) ou null. */
export function persistAge(key: string): number | null {
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<unknown>;
    return typeof env?.at === 'number' ? env.at : null;
  } catch { return null; }
}

/** Supprime une entrée. */
export function persistRemove(key: string): void {
  try { localStorage.removeItem(fullKey(key)); } catch { /* ignore */ }
}

/** Supprime TOUTES les entrées de cache namespacées (ex. à la déconnexion). */
export function persistClearAll(): void {
  try {
    const prefix = `${NAMESPACE}.cache.`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch { /* ignore */ }
}
