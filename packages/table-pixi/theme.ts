import type { Card } from 'belote-core';

/**
 * PixiTableTheme — mirrors the Claude Design token set (tokens/themes.css).
 * Three built-in templates: local, vip, competition. Every color a layer needs
 * comes from here; the same tokens are exposed to the HTML HUD as CSS variables.
 */
export interface PixiTableTheme {
  name: string;
  /** Theme-scoped table tokens (--table-*). Pixi hex numbers. */
  felt1: number; felt2: number;
  rail: number; railHi: number; railLo: number; railInner: number;
  accent: number; accent2: number;
  watermarkRed: string; watermarkNeutral: string; // rgba strings for atlas/notes
  text: number; textDim: number;
  surface: number; surface2: number;

  /** Base palette (theme-agnostic, colors.css). */
  suitRed: number; suitBlack: number;
  teamBlue: number; teamBlue2: number;
  teamYellow: number; teamYellow2: number;
  chipDealer: number; chipEntame: number; chipMeneur: number;
  paper: number;

  /** Behavior */
  opponentCards: 'hidden' | 'back' | 'faceup';
}

const BASE = {
  suitRed: 0xc41e3a, suitBlack: 0x0a0a0a,
  teamBlue: 0x4b57d1, teamBlue2: 0x6b78ea,
  teamYellow: 0xf4c542, teamYellow2: 0xffd766,
  chipDealer: 0xe63946, chipEntame: 0xf4c542, chipMeneur: 0x64d17b,
  paper: 0xf4ecd6,
  opponentCards: 'back' as const,
};

/** Table Local — casual public tables, warm mid-green felt, wooden rail. */
export const localTheme: PixiTableTheme = {
  name: 'local', ...BASE,
  felt1: 0x1a5c3a, felt2: 0x0f3f27,
  rail: 0x6b3a1a, railHi: 0x8f5028, railLo: 0x3a1c0a, railInner: 0x241108,
  accent: 0xd4a24a, accent2: 0xf0c46a,
  watermarkRed: 'rgba(196,30,58,0.10)', watermarkNeutral: 'rgba(255,255,255,0.05)',
  text: 0xf6f7f9, textDim: 0xc7cdd4,
  surface: 0x0f2c1e, surface2: 0x163726,
};

/** Table VIP — deep emerald + gold + polished mahogany. */
export const vipTheme: PixiTableTheme = {
  name: 'vip', ...BASE,
  felt1: 0x0f4a35, felt2: 0x05271a,
  rail: 0x3a1a0f, railHi: 0x6b3a20, railLo: 0x1a0805, railInner: 0x100604,
  accent: 0xf0c46a, accent2: 0xffe28a,
  watermarkRed: 'rgba(196,30,58,0.10)', watermarkNeutral: 'rgba(240,196,106,0.06)',
  text: 0xfff8e6, textDim: 0xd6cba8,
  surface: 0x0a2b1f, surface2: 0x12402e,
};

/** Table Compétition — navy felt, silver rail, high-contrast, sober. */
export const competitionTheme: PixiTableTheme = {
  name: 'competition', ...BASE,
  felt1: 0x17324f, felt2: 0x0a1a2c,
  rail: 0x2a323d, railHi: 0x4a5563, railLo: 0x10151d, railInner: 0x060a10,
  accent: 0xcfd6e0, accent2: 0xffffff,
  watermarkRed: 'rgba(196,30,58,0.12)', watermarkNeutral: 'rgba(255,255,255,0.06)',
  text: 0xf6f9ff, textDim: 0xb8c4d4,
  surface: 0x0e1e30, surface2: 0x16304c,
};

const REGISTRY = new Map<string, PixiTableTheme>([
  ['local', localTheme], ['vip', vipTheme], ['competition', competitionTheme],
]);

export function registerTheme(t: PixiTableTheme) { REGISTRY.set(t.name, t); }
export function getTheme(name?: string): PixiTableTheme {
  return (name && REGISTRY.get(name)) || localTheme;
}
export function listThemes(): PixiTableTheme[] { return [...REGISTRY.values()]; }

/** Deep-copy + partial override on top of a named theme. */
export function themeWith(name: string, over?: Partial<PixiTableTheme>): PixiTableTheme {
  return { ...getTheme(name), ...(over ?? {}) };
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** CSS variables for the HTML HUD (same names as the design system). */
export function themeCssVars(t: PixiTableTheme): Record<string, string> {
  return {
    '--table-felt-1': hex(t.felt1), '--table-felt-2': hex(t.felt2),
    '--table-rail': hex(t.rail), '--table-rail-hi': hex(t.railHi),
    '--table-rail-lo': hex(t.railLo), '--table-rail-inner': hex(t.railInner),
    '--table-accent': hex(t.accent), '--table-accent-2': hex(t.accent2),
    '--table-text': hex(t.text), '--table-text-dim': hex(t.textDim),
    '--table-surface': hex(t.surface), '--table-surface-2': hex(t.surface2),
    '--table-border': t.name === 'vip' ? 'rgba(240,196,106,0.20)' : t.name === 'competition' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.10)',
    '--table-watermark': t.watermarkNeutral,
  };
}

/** Cards used across the game. */
export const SUITS_ORDER: Card['suit'][] = ['pique', 'coeur', 'carreau', 'trefle'];
