import { describe, it, expect } from 'vitest';
import { GameEngine } from './GameEngine';
import { ContreeRules } from '../rules/ContreeRules';
import { DEFAULT_PARTIE } from './types';
import type { Seat } from '../domain/types';

/* =============================================================================
 * v16 — Le score cible d'une manche (baseTarget) est désormais CONFIGURABLE
 * (le back-office peut le fixer par tournoi / table). Ce test garantit que le
 * moteur applique bien le baseTarget fourni au lieu du 1500 historique.
 * ========================================================================== */
const rules = new ContreeRules();
const players = (['A', 'B', 'C', 'D'] as const).map((name, s) => ({ seat: s as Seat, name, type: 'human' as const }));

describe('PartieConfig · score cible configurable (v16)', () => {
  it('applique le baseTarget par défaut (1500) quand non surchargé', () => {
    const e = new GameEngine(players as any, { ...DEFAULT_PARTIE }, rules);
    expect(e.view().target).toBe(1500);
  });

  it('applique un baseTarget personnalisé (1000)', () => {
    const e = new GameEngine(players as any, { ...DEFAULT_PARTIE, baseTarget: 1000 }, rules);
    expect(e.view().target).toBe(1000);
  });

  it('applique un baseTarget personnalisé (3000)', () => {
    const e = new GameEngine(players as any, { ...DEFAULT_PARTIE, baseTarget: 3000 }, rules);
    expect(e.view().target).toBe(3000);
  });
});
