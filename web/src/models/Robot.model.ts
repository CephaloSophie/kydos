import type { RobotFiche } from 'belote-core';

/** Vue minimale d'un robot (affichage, sélection). */
export interface RobotSummary {
  id: string;
  name: string;
}

/**
 * Élément de liste renvoyé par l'API : id/name garantis (affichage) + fiche complète
 * (personnalité, algoSpec…) pour construire le robot via robotFromFiche, comme le back.
 */
export interface RobotListItem extends RobotSummary {
  personality?: RobotFiche['personality'];
  responseTimeMs?: number;
  maxPlayTimeMs?: number;
  algoSpec?: RobotFiche['algoSpec'];
}
