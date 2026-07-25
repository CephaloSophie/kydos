/* =============================================================================
 * SERVICES · gameSetup.ts — Configuration d'une partie contre robots.
 * -----------------------------------------------------------------------------
 * Types + résolveurs PURS pour transformer un choix de configuration
 * (emplacement des sièges, visibilité, manches) en paramètres exploitables
 * par la table Pixi et le moteur. Aucune dépendance au DOM ou à React,
 * entièrement testable.
 * ========================================================================== */

/** Choix pour un siège : robot auto / joueur humain / robot spécifique (id). */
export type SeatChoice = 'auto' | 'me' | string;

/** Visibilité des cartes lors de la partie. */
export type Visibility = 'none' | 'robots' | 'all';

/** Configuration complète d'une partie contre robots (avec le sens habituel :
 *  sièges A/B/C/D = index 0/1/2/3, équipes NOUS = 0+2, EUX = 1+3). */
export interface GameSetup {
  seats: [SeatChoice, SeatChoice, SeatChoice, SeatChoice];
  visibility: Visibility;
  manches: MancheOption;
}

/** Valeurs par défaut : moi en A, robots auto ailleurs, personne ne voit, 2 manches. */
export const DEFAULT_SETUP: GameSetup = {
  seats: ['me', 'auto', 'auto', 'auto'],
  visibility: 'none',
  manches: 2,
};

/**
 * Options de manches proposées dans le dialogue.
 * ATTENTION : le moteur `belote-core` n'accepte que 1, 2 ou 4 manches
 * (voir `GameEngine` — union stricte de littéraux).
 */
export const MANCHES_OPTIONS = [1, 2, 4] as const;
export type MancheOption = (typeof MANCHES_OPTIONS)[number];

/** Renvoie le siège humain (0..3) ou null si la partie est entre robots. */
export function mySeatFromSetup(setup: GameSetup): 0 | 1 | 2 | 3 | null {
  const idx = setup.seats.findIndex((s) => s === 'me');
  return idx === -1 ? null : (idx as 0 | 1 | 2 | 3);
}

/**
 * Sièges dont l'utilisateur voit les cartes, selon le mode de visibilité.
 * - 'none'   : personne d'autre que moi (mais mon coéquipier reste caché).
 * - 'robots' : moi + tous mes robots (ceux dont l'id est dans robotIds).
 * - 'all'    : tous les sièges (sauf mon coéquipier, règle du jeu belote).
 *
 * ATTENTION : le coéquipier n'est JAMAIS visible (règle de belote). PixiTable
 * applique déjà cette contrainte via `partnerFaceDown` quand `mySeat` est
 * défini, donc on renvoie ici les sièges « souhaités » — la table filtre
 * ensuite le coéquipier.
 */
export function visibleSeatsFromSetup(setup: GameSetup, myRobotIds: Set<string>): Set<0 | 1 | 2 | 3> {
  const my = mySeatFromSetup(setup);
  const result = new Set<0 | 1 | 2 | 3>();
  if (my !== null) result.add(my);
  for (let i = 0; i < 4; i++) {
    const choice = setup.seats[i];
    if (setup.visibility === 'all') result.add(i as 0 | 1 | 2 | 3);
    else if (setup.visibility === 'robots' && choice !== 'auto' && choice !== 'me' && myRobotIds.has(choice)) {
      result.add(i as 0 | 1 | 2 | 3);
    }
  }
  return result;
}

/** Vrai si la configuration est jouable (un seul « moi » max, manches > 0). */
export function isSetupValid(setup: GameSetup): boolean {
  const me = setup.seats.filter((s) => s === 'me').length;
  return me <= 1 && setup.manches > 0;
}
