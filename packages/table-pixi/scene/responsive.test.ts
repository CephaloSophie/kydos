// Unit tests for the responsive card sizing (pure function).
import { describe, expect, it } from 'vitest';
import { responsiveCardW } from './TableScene';

describe('responsiveCardW — continuous proportional scale', () => {
  it('clamps to [40, 84]', () => {
    expect(responsiveCardW(200, 150)).toBe(40);   // tiny felt → floor
    expect(responsiveCardW(4000, 3000)).toBe(84); // huge felt → ceiling
  });

  it('scales with the smaller constraint (width vs height)', () => {
    // Landscape phone ≈ 740×330 felt → height-bound: 330/5.6 ≈ 58.
    expect(responsiveCardW(740, 330)).toBe(58);
    // Narrow felt → width-bound: 500/11 ≈ 45.
    expect(responsiveCardW(500, 600)).toBe(45);
  });

  it('is monotonic: a bigger felt never yields a smaller card', () => {
    let prev = 0;
    for (let h = 200; h <= 1000; h += 50) {
      const w = responsiveCardW(1400, h);
      expect(w).toBeGreaterThanOrEqual(prev);
      prev = w;
    }
  });

  it('desktop felt lands on the DS md/lg range', () => {
    const w = responsiveCardW(1200, 640);
    expect(w).toBeGreaterThanOrEqual(68);
    expect(w).toBeLessThanOrEqual(84);
  });
});
