/* =============================================================================
 * SERVICES · promoCode.ts — Formatage/normalisation du code promo (pur, testé).
 * -----------------------------------------------------------------------------
 * Le code est composé de 12 CHIFFRES. À l'affichage, on insère un tiret tous les
 * 4 chiffres (1234-5678-9012). La valeur envoyée au serveur ne contient que les
 * chiffres. Le formatage est purement présentationnel.
 * ========================================================================== */

/** Ne garde que les chiffres, limité à 12. */
export function digitsOnly(raw: string): string {
  return (raw ?? '').replace(/\D/g, '').slice(0, 12);
}

/** Formate pour l'affichage : un tiret tous les 4 chiffres (max 12). */
export function formatPromoCode(raw: string): string {
  const digits = digitsOnly(raw);
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) groups.push(digits.slice(i, i + 4));
  return groups.join('-');
}

/** Le code est-il complet (exactement 12 chiffres) ? */
export function isCompleteCode(raw: string): boolean {
  return digitsOnly(raw).length === 12;
}
