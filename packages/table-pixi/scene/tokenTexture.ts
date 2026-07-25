import { Texture } from 'pixi.js';

/**
 * Chip textures — design-system Chip.jsx:
 * radial-gradient(circle at 30% 25%, hi, base 60%, lo), white 2px border,
 * bold letter, drop + inset shadows approximated.
 */
const CHIP_SPECS = {
  dealer: { hi: '#ff6b6b', base: '#e63946', lo: '#a01e2b', letter: 'D', text: '#ffffff' },
  entame: { hi: '#ffe28a', base: '#f4c542', lo: '#b0821a', letter: 'E', text: '#3a2600' },
  meneur: { hi: '#a8f0be', base: '#64d17b', lo: '#2a7a48', letter: 'M', text: '#0a2a15' },
} as const;
export type ChipKind = keyof typeof CHIP_SPECS;

export function makeChipTexture(kind: ChipKind, size = 64, dpr = 3): Texture {
  const s = CHIP_SPECS[kind];
  const cv = document.createElement('canvas');
  cv.width = size * dpr; cv.height = size * dpr;
  const ctx = cv.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const c = size / 2, R = size / 2 - 2;

  // Radial gradient at 30% 25%.
  const g = ctx.createRadialGradient(size * 0.3, size * 0.25, R * 0.1, c, c, R);
  g.addColorStop(0, s.hi); g.addColorStop(0.6, s.base); g.addColorStop(1, s.lo);
  ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();

  // White border 2px.
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();

  // Inset bottom shadow hint.
  ctx.beginPath(); ctx.arc(c, c + 1, R - 2, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 2; ctx.stroke();

  // Letter.
  ctx.fillStyle = s.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(size * 0.47)}px "Manrope", ui-sans-serif, sans-serif`;
  ctx.fillText(s.letter, c, c + size * 0.02);
  return Texture.from(cv);
}

/**
 * Team logo textures — design-system PlayerStation.jsx:
 * blue: 135° gradient #6b78ea → #3a44a8 with the team initial;
 * yellow: checker (repeating-conic #f4c542 / #1a1a1a).
 */
export function makeTeamLogoTexture(team: 'blue' | 'yellow', initial: string, size = 64, dpr = 3): Texture {
  const cv = document.createElement('canvas');
  cv.width = size * dpr; cv.height = size * dpr;
  const ctx = cv.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const c = size / 2, R = size / 2 - 1;

  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.clip();
  if (team === 'blue') {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#6b78ea'); g.addColorStop(1, '#3a44a8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(size * 0.42)}px "Manrope", sans-serif`;
    ctx.fillText(initial, c, c + 1);
  } else {
    // 2×2 checker (repeating-conic approximation).
    const q = size / 2;
    ctx.fillStyle = '#f4c542'; ctx.fillRect(0, 0, q, q); ctx.fillRect(q, q, q, q);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(q, 0, q, q); ctx.fillRect(0, q, q, q);
  }
  ctx.restore();
  // Inner top light / bottom shade (inset shadows of the spec).
  ctx.beginPath(); ctx.arc(c, c - 0.5, R - 1, Math.PI * 1.15, Math.PI * 1.85);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(c, c + 0.5, R - 1, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  return Texture.from(cv);
}
