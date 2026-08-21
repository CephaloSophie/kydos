/* =============================================================================
 * BACK-OFFICE · statusSync.ts — Cohérence status ⇆ active (PUR).
 * -----------------------------------------------------------------------------
 * v18 — Les entités « variante de MATCH RAPIDE » et « thème » ont un cycle de
 * vie éditorial `status` ∈ {draft, pending, active}. L'app mobile continue de
 * filtrer sur `active` (booléen). Ce module garantit que les deux restent
 * cohérents : `active === (status === 'active')`.
 *
 * Fonctions PURES → testables seules.
 * ========================================================================== */

export type LifecycleStatus = 'draft' | 'pending' | 'active';

export function isLifecycleStatus(v: unknown): v is LifecycleStatus {
  return v === 'draft' || v === 'pending' || v === 'active';
}

/**
 * Résout le couple {status, active} cohérent à partir des entrées possibles :
 *   • si `status` valide est fourni → il fait foi ; active en découle.
 *   • sinon si `active` booléen est fourni → status = active ? 'active' : 'draft'.
 *   • sinon → on garde les valeurs courantes (`current`).
 */
export function resolveStatus(
  input: { status?: unknown; active?: unknown },
  current: { status?: LifecycleStatus; active?: boolean } = {},
): { status: LifecycleStatus; active: boolean } {
  if (isLifecycleStatus(input.status)) {
    return { status: input.status, active: input.status === 'active' };
  }
  if (typeof input.active === 'boolean') {
    const status: LifecycleStatus = input.active ? 'active' : 'draft';
    return { status, active: input.active };
  }
  const status = current.status ?? 'active';
  return { status, active: current.active ?? status === 'active' };
}
