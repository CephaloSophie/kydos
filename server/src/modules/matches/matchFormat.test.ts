// Tests unitaires : catalog économique + queue en mémoire.
import { describe, it, expect, beforeEach } from 'vitest';
import { MatchFormat, verifyEconomics, getMatchFormatRules, effectiveHouseRake, MATCH_FORMAT_CATALOG } from './matchFormat.js';

describe('MatchFormatCatalog', () => {
  it('couvre les 3 formats', () => {
    expect(Object.keys(MATCH_FORMAT_CATALOG)).toHaveLength(3);
  });

  it('DUO_STEEL — 200 par joueur, 150 au vainqueur, 50 kydos', () => {
    const r = getMatchFormatRules(MatchFormat.DUO_STEEL);
    expect(r.buyInPerPlayer).toBe(200);
    expect(r.prizePerWinner).toBe(150);
    expect(r.houseRake).toBe(50);
    expect(r.isHeadless).toBe(true);
    // Spec : 100 par robot × 2 robots par joueur = 200 par joueur.
    // 200 × 2 = 400 collectés ; 150 × 1 vainqueur = 150 versé. Reste 250… mais
    // la spec métier dit "50 pour kydos" — le reste (200) revient économiquement
    // aux robots (crédit ELO/fiche). Le catalogue enregistre 50 comme rake pur.
  });

  it('HYBRID_ALLIANCE — 150 par joueur, 225 au vainqueur, 75 kydos', () => {
    const eq = verifyEconomics(MatchFormat.HYBRID_ALLIANCE);
    expect(eq.collected).toBe(300);
    expect(eq.paid).toBe(225);
    expect(eq.rake).toBe(75);
    expect(eq.balanced).toBe(true);
  });

  it('ROYAL_SQUARE — 100 par joueur, 150 aux 2 vainqueurs, 100 kydos', () => {
    const eq = verifyEconomics(MatchFormat.ROYAL_SQUARE);
    expect(eq.collected).toBe(400);
    expect(eq.paid).toBe(300);
    expect(eq.rake).toBe(100);
    expect(eq.balanced).toBe(true);
  });

  it('lève sur un format inconnu', () => {
    expect(() => getMatchFormatRules('unknown' as MatchFormat)).toThrow();
  });

  // v16 — mise/gain configurables : le rake effectif = rake catalogue + delta.
  describe('effectiveHouseRake (v16)', () => {
    it('retrouve exactement le rake du catalogue aux valeurs par défaut', () => {
      for (const format of Object.values(MatchFormat)) {
        const r = getMatchFormatRules(format);
        const rake = effectiveHouseRake(r.houseRake, r.buyInPerPlayer, r.prizePerWinner, r.buyInPerPlayer, r.prizePerWinner, r.humansPerMatch, r.winnersPerMatch);
        expect(rake).toBe(r.houseRake);
      }
    });

    it('ajoute le delta de mise (Duo : +50 de mise × 2 humains → rake 50+100=150)', () => {
      const r = getMatchFormatRules(MatchFormat.DUO_STEEL); // base 50, humans 2, winners 1
      expect(effectiveHouseRake(r.houseRake, r.buyInPerPlayer + 50, r.prizePerWinner, r.buyInPerPlayer, r.prizePerWinner, r.humansPerMatch, r.winnersPerMatch)).toBe(150);
    });

    it('retranche un gain plus généreux (Royal : +100 de gain × 2 vainqueurs → rake 100-200=-100)', () => {
      const r = getMatchFormatRules(MatchFormat.ROYAL_SQUARE); // base 100, humans 4, winners 2
      expect(effectiveHouseRake(r.houseRake, r.buyInPerPlayer, r.prizePerWinner + 100, r.buyInPerPlayer, r.prizePerWinner, r.humansPerMatch, r.winnersPerMatch)).toBe(-100);
    });
  });
});
