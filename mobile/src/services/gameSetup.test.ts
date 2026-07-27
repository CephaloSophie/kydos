// Tests unitaires — configuration d'une partie (résolution pure).
// Verify seat resolution, visibility rules, and setup validation.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETUP, isSetupValid, mySeatFromSetup, visibleSeatsFromSetup,
  type GameSetup,
} from './gameSetup';

describe('mySeatFromSetup', () => {
  it('retourne le siège où « me » est placé', () => {
    expect(mySeatFromSetup(DEFAULT_SETUP)).toBe(0);
    expect(mySeatFromSetup({ ...DEFAULT_SETUP, seats: ['auto', 'auto', 'me', 'auto'] })).toBe(2);
  });

  it('retourne null quand tous les sièges sont des robots (mode observateur)', () => {
    expect(mySeatFromSetup({ ...DEFAULT_SETUP, seats: ['auto', 'auto', 'auto', 'auto'] })).toBeNull();
  });
});

describe('visibleSeatsFromSetup', () => {
  const myRobots = new Set(['r_atne', 'r_bato']);

  it('mode « none » : seul mon siège est dans la liste', () => {
    const s: GameSetup = { seats: ['me', 'r_atne', 'auto', 'auto'], visibility: 'none', manches: 2 };
    expect(visibleSeatsFromSetup(s, myRobots)).toEqual(new Set([0]));
  });

  it('mode « robots » : mon siège + les sièges où sont MES robots', () => {
    const s: GameSetup = { seats: ['me', 'r_atne', 'auto', 'r_bato'], visibility: 'robots', manches: 2 };
    expect(visibleSeatsFromSetup(s, myRobots)).toEqual(new Set([0, 1, 3]));
  });

  it('mode « robots » : ignore les sièges auto (robots génériques)', () => {
    const s: GameSetup = { seats: ['me', 'auto', 'auto', 'auto'], visibility: 'robots', manches: 2 };
    expect(visibleSeatsFromSetup(s, myRobots)).toEqual(new Set([0]));
  });

  it('mode « all » : tous les sièges (le filtre coéquipier est appliqué par PixiTable)', () => {
    const s: GameSetup = { seats: ['me', 'auto', 'auto', 'auto'], visibility: 'all', manches: 2 };
    expect(visibleSeatsFromSetup(s, myRobots)).toEqual(new Set([0, 1, 2, 3]));
  });

  it('mode observateur (pas de « me ») : liste vide en « none »', () => {
    const s: GameSetup = { seats: ['auto', 'auto', 'auto', 'auto'], visibility: 'none', manches: 2 };
    expect(visibleSeatsFromSetup(s, myRobots)).toEqual(new Set());
  });
});

describe('isSetupValid', () => {
  it('valide la configuration par défaut', () => {
    expect(isSetupValid(DEFAULT_SETUP)).toBe(true);
  });

  it('refuse deux joueurs humains (impossible)', () => {
    expect(isSetupValid({ ...DEFAULT_SETUP, seats: ['me', 'me', 'auto', 'auto'] })).toBe(false);
  });

  it('refuse 0 manche', () => {
    // L'union littérale 1|2|4 empêche déjà les valeurs invalides au typecheck ;
    // on valide néanmoins la borne (>0) en runtime pour robustesse.
    expect(isSetupValid({ ...DEFAULT_SETUP, manches: 0 as unknown as 1 })).toBe(false);
  });

  it('accepte l\'observation pure (aucun « me »)', () => {
    expect(isSetupValid({ ...DEFAULT_SETUP, seats: ['auto', 'auto', 'auto', 'auto'] })).toBe(true);
  });
});
