export interface PlayerSignals {
  userId: string;
  ip?: string;
  deviceId?: string;
}

export interface EligibilityContext {
  tableType?: 'friendly' | 'ranked' | 'competition' | string;
  players: PlayerSignals[];
  history?: unknown;
}

/**
 * Porte d'autorisation entre joueurs.
 * Aujourd'hui : toujours autorisé. Demain : anti-triche, historique, IP/device,
 * règles de compétition / événements.
 */
export class EligibilityService {
  canPlayTogether(_context: EligibilityContext): boolean {
    return true;
  }
}

export const eligibilityService = new EligibilityService();
