import { describe, it, expect } from 'vitest';
import { hashName, teamHsl, hslToHex, teamColorHex, responsiveCardWidth, tableRect } from './layout';

describe('table-pixi layout helpers', () => {
  // The name hash must be stable so a given player always gets the same logo/color.
  it('hashName is deterministic for the same input', () => {
    expect(hashName('Borée')).toBe(hashName('Borée'));
    expect(hashName('a')).not.toBe(hashName('b'));
  });

  // Team color is derived purely from the name (never hard-coded).
  it('teamHsl stays within valid HSL ranges', () => {
    const c = teamHsl('Calliope');
    expect(c.h).toBeGreaterThanOrEqual(0);
    expect(c.h).toBeLessThan(360);
    expect(c.s).toBeGreaterThanOrEqual(0);
    expect(c.l).toBeLessThanOrEqual(100);
  });

  // HSL -> hex conversion: check a few known anchors.
  it('hslToHex converts primary colors correctly', () => {
    expect(hslToHex(0, 100, 50)).toBe(0xff0000);   // red
    expect(hslToHex(120, 100, 50)).toBe(0x00ff00); // green
    expect(hslToHex(240, 100, 50)).toBe(0x0000ff); // blue
    expect(hslToHex(0, 0, 100)).toBe(0xffffff);    // white
    expect(hslToHex(0, 0, 0)).toBe(0x000000);      // black
  });

  it('teamColorHex returns a 24-bit integer', () => {
    const hex = teamColorHex('Damon');
    expect(hex).toBeGreaterThanOrEqual(0);
    expect(hex).toBeLessThanOrEqual(0xffffff);
  });

  // Responsive card width shrinks on narrow screens, caps on wide ones.
  it('responsiveCardWidth respects min/max bounds', () => {
    const wide = responsiveCardWidth(2000, 8, { min: 46, max: 92 });
    const narrow = responsiveCardWidth(360, 8, { min: 46, max: 92 });
    expect(wide).toBe(92);            // capped at max on a wide screen
    expect(narrow).toBeLessThan(wide); // smaller on a narrow screen
    expect(narrow).toBeGreaterThanOrEqual(46);
  });

  // The table is a rounded rectangle (not an ellipse): centered, inset, with corner radius.
  it('tableRect is centered and inset within the viewport', () => {
    const r = tableRect(1000, 600);
    expect(r.x).toBeGreaterThan(0);
    expect(r.y).toBeGreaterThan(0);
    expect(r.x + r.w).toBeLessThanOrEqual(1000);
    expect(r.y + r.h).toBeLessThanOrEqual(600);
    expect(r.r).toBeGreaterThan(0); // rounded corners
  });
});

import { sceneScale } from './layout';
describe('sceneScale — proportional sizing', () => {
  // Everything on the table scales with the felt height, within readable bounds.
  it('is 1 at the reference felt height and clamped at extremes', () => {
    expect(sceneScale(620)).toBeCloseTo(1, 2);
    expect(sceneScale(310)).toBeGreaterThanOrEqual(0.62);
    expect(sceneScale(2000)).toBeLessThanOrEqual(1.35);
    expect(sceneScale(900)).toBeGreaterThan(sceneScale(500)); // monotonic
  });
});
