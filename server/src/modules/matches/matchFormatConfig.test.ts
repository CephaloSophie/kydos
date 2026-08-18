/* =============================================================================
 * v16 — buildEffective : fusion structure catalogue + variante éditable.
 * Fonction sans I/O (prend un doc de config déjà chargé) → testable directement.
 * ========================================================================== */
import { describe, it, expect } from 'vitest';
import { matchFormatConfigService } from './matchFormatConfig.service.js';
import { MatchFormat } from './matchFormat.js';

describe('MatchFormatConfigService.buildEffective (v16)', () => {
  it('reprend l’id de la variante et le format', () => {
    const eff = matchFormatConfigService.buildEffective(MatchFormat.DUO_STEEL, { _id: 'v1', buyInPerPlayer: 200, prizePerWinner: 150 });
    expect(eff.id).toBe('v1');
    expect(eff.format).toBe(MatchFormat.DUO_STEEL);
    expect(eff.isHeadless).toBe(true);        // structurel (catalogue)
    expect(eff.humansPerMatch).toBe(2);
  });

  it('applique mise/gain personnalisés et recalcule le rake (Duo : 300/100 → 150)', () => {
    const eff = matchFormatConfigService.buildEffective(MatchFormat.DUO_STEEL, { _id: 'v2', buyInPerPlayer: 300, prizePerWinner: 100 });
    expect(eff.buyInPerPlayer).toBe(300);
    expect(eff.prizePerWinner).toBe(100);
    // rake catalogue 50 + (300-200)*2 - (100-150)*1 = 50 + 200 + 50 = 300
    expect(eff.houseRake).toBe(300);
  });

  it('reprend les critères de niveau et l’état actif de la variante', () => {
    const eff = matchFormatConfigService.buildEffective(MatchFormat.HYBRID_ALLIANCE, { _id: 'v3', minLevel: 5, maxLevel: 20, active: false });
    expect(eff.minLevel).toBe(5);
    expect(eff.maxLevel).toBe(20);
    expect(eff.active).toBe(false);
  });

  it('tombe sur les valeurs par défaut si la variante est vide', () => {
    const eff = matchFormatConfigService.buildEffective(MatchFormat.ROYAL_SQUARE, {});
    expect(eff.manches).toBe(2);
    expect(eff.baseTarget).toBe(1500);
    expect(eff.minLevel).toBe(0);
    expect(eff.maxLevel).toBeNull();
  });
});
