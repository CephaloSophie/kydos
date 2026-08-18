/* =============================================================================
 * v16 — Éligibilité par niveau d'un MATCH RAPIDE (fonction pure).
 * ========================================================================== */
import { describe, it, expect } from 'vitest';
import { isLevelEligible } from './matchFormatConfig.service.js';

describe('isLevelEligible (v16)', () => {
  it('autorise quand le niveau est dans [min, max]', () => {
    expect(isLevelEligible(5, 3, 10)).toBe(true);
    expect(isLevelEligible(3, 3, 10)).toBe(true);   // borne min incluse
    expect(isLevelEligible(10, 3, 10)).toBe(true);  // borne max incluse
  });

  it('refuse sous le niveau minimum requis', () => {
    expect(isLevelEligible(2, 3, 10)).toBe(false);
  });

  it('refuse au-dessus du niveau maximum', () => {
    expect(isLevelEligible(11, 3, 10)).toBe(false);
  });

  it('maxLevel null = pas de plafond', () => {
    expect(isLevelEligible(999, 0, null)).toBe(true);
    expect(isLevelEligible(0, 0, null)).toBe(true);
  });

  it('par défaut (min 0, max null) tout le monde est éligible', () => {
    expect(isLevelEligible(0, 0, null)).toBe(true);
    expect(isLevelEligible(50, 0, null)).toBe(true);
  });
});
