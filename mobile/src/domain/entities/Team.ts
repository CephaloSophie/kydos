/* =============================================================================
 * DOMAIN · entities/Team.ts — Entité métier « Équipe ».
 * -----------------------------------------------------------------------------
 * Rôles et permissions MIROIR du serveur (`server/src/modules/team/permissions.ts`)
 * pour que l'UI puisse afficher / masquer les actions AVANT même l'appel API
 * (économise des allers-retours, améliore la clarté visuelle).
 * Le serveur reste seul juge : chaque action est re-vérifiée côté back.
 * ========================================================================== */

export const TEAM_ROLES = ['owner', 'super', 'admin', 'user'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_MAX_MEMBERS = 40;

const AUTHORITY: Record<TeamRole, number> = { owner: 4, super: 3, admin: 2, user: 1 };
export const authority = (role: TeamRole) => AUTHORITY[role];

/** Peut agir (kick, changer rôle) sur une cible strictement plus faible. */
export const canAct = (actor: TeamRole, target: TeamRole) => AUTHORITY[actor] > AUTHORITY[target];

/** Peut attribuer un rôle donné (owner protégé, doit rester strictement inférieur). */
export function canAssign(actor: TeamRole, newRole: TeamRole): boolean {
  if (newRole === 'owner') return false;
  return AUTHORITY[actor] > AUTHORITY[newRole];
}

export const canRenameTeam = (actor: TeamRole) => actor === 'owner' || actor === 'super';
export const canChangeVisibility = (actor: TeamRole) => actor === 'owner';
export const canInvite = (actor: TeamRole) => actor === 'owner' || actor === 'super' || actor === 'admin';

/** Libellés lisibles en français pour l'UI. */
export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Propriétaire',
  super: 'Super admin',
  admin: 'Admin',
  user: 'Membre',
};

/** Couleur d'accent par rôle (tokens du DS). */
export const ROLE_ACCENTS: Record<TeamRole, string> = {
  owner: 'var(--c-gold)',
  super: '#b39ddb',
  admin: '#9db4dd',
  user: 'var(--c-text-soft)',
};
