import { TEAM_ROLES, type TeamRole } from './team.model.js';

/**
 * Autorité numérique d'un rôle : plus grand = plus fort.
 * Utilisé pour vérifier qu'un acteur ne peut agir QUE sur des rôles
 * strictement inférieurs au sien.
 */
const AUTHORITY: Record<TeamRole, number> = { owner: 4, super: 3, admin: 2, user: 1 };

export function authority(role: TeamRole): number { return AUTHORITY[role]; }

/**
 * Vrai si `actor` peut agir (kick, changer le rôle) sur `target`.
 * Règles :
 *   - un rôle n'agit jamais sur un rôle >= au sien ;
 *   - un `owner` peut tout ; `super` peut sur `admin`+`user` ; `admin` sur
 *     `user` uniquement ; `user` ne peut rien.
 */
export function canAct(actor: TeamRole, target: TeamRole): boolean {
  return AUTHORITY[actor] > AUTHORITY[target];
}

/**
 * Vrai si `actor` peut ATTRIBUER `newRole` à quelqu'un.
 * Contraintes :
 *   - impossible d'attribuer `owner` (transfert de propriété = flux distinct) ;
 *   - `super` ne peut pas nommer un autre `super` ;
 *   - le rôle attribué doit être strictement inférieur à l'autorité de l'acteur.
 */
export function canAssign(actor: TeamRole, newRole: TeamRole): boolean {
  if (newRole === 'owner') return false;
  return AUTHORITY[actor] > AUTHORITY[newRole];
}

/** Vrai si `actor` peut renommer l'équipe. */
export function canRenameTeam(actor: TeamRole): boolean {
  return actor === 'owner' || actor === 'super';
}

/** Vrai si `actor` peut inviter de nouveaux membres. */
export function canInvite(actor: TeamRole): boolean {
  return actor === 'owner' || actor === 'super' || actor === 'admin';
}

/** Liste triée des rôles présentables (owner > super > admin > user). */
export const ROLES_BY_AUTHORITY: readonly TeamRole[] = [...TEAM_ROLES].sort((a, b) => AUTHORITY[b] - AUTHORITY[a]);
