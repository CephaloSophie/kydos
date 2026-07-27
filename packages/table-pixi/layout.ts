// ============================================================================
//  Pure layout / color helpers for the Pixi table.
//  No Pixi, no DOM — easy to unit-test.
// ============================================================================

/** Deterministic FNV-1a 32-bit hash of a string (same algorithm as the DOM TeamBadge). */
export function hashName(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** HSL components (h: 0..360, s/l: 0..100) derived from a name — single source of truth for team color. */
export function teamHsl(name: string): { h: number; s: number; l: number } {
  const h = hashName(name || '');
  return { h: h % 360, s: 58 + ((h >> 9) % 18), l: 52 + ((h >> 17) % 10) };
}

/** Convert HSL (h 0..360, s/l 0..100) to a 0xRRGGBB integer usable by Pixi. */
export function hslToHex(h: number, s: number, l: number): number {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = ln - c / 2;
  const to255 = (v: number) => Math.round((v + m) * 255);
  return (to255(r) << 16) | (to255(g) << 8) | to255(b);
}

/** Team color (0xRRGGBB) derived from a player/clan name. */
export function teamColorHex(name: string): number {
  const c = teamHsl(name);
  return hslToHex(c.h, c.s, c.l);
}

/**
 * Compute a responsive card width so the hand fits the container nicely.
 * Cards shrink on small screens and never exceed `max` on large ones.
 */
export function responsiveCardWidth(containerWidth: number, cardCount: number, opts?: { min?: number; max?: number; ratio?: number }): number {
  const min = opts?.min ?? 46;
  const max = opts?.max ?? 92;
  const ratio = opts?.ratio ?? 0.92; // overlap factor between adjacent cards
  const n = Math.max(1, cardCount);
  // Leave a margin on both sides; distribute the rest across the fan.
  const available = Math.max(0, containerWidth - 60);
  const byWidth = available / (1 + (n - 1) * ratio);
  return Math.round(Math.min(max, Math.max(min, byWidth)));
}

/** Rounded-rectangle table geometry (NOT an ellipse) — resembles a real card table. */
export function tableRect(width: number, height: number, opts?: { insetX?: number; insetY?: number; maxW?: number; maxH?: number }): { x: number; y: number; w: number; h: number; r: number } {
  const insetX = opts?.insetX ?? 0.12;
  const insetY = opts?.insetY ?? 0.16;
  const maxW = opts?.maxW ?? 1100;
  const maxH = opts?.maxH ?? 720;
  const w = Math.min(width * (1 - insetX * 2), maxW);
  const h = Math.min(height * (1 - insetY * 2), maxH);
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  const r = Math.min(w, h) * 0.16; // generous corner radius (stadium-ish)
  return { x, y, w, h, r };
}

/**
 * Proportional scale factor for every on-table element (fonts, pills, jetons, badges).
 * 1 at a 620px-tall felt; clamped so tiny/huge screens stay readable.
 */
export function sceneScale(rectH: number): number {
  return Math.min(1.35, Math.max(0.62, rectH / 620));
}
