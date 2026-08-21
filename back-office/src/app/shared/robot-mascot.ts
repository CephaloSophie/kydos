/* =============================================================================
 * BACK-OFFICE · shared/robot-mascot.ts — Générateur SVG de la mascotte robot.
 * Miroir de mobile/src/presentation/components/RobotMascot.ts (rendu identique).
 * ========================================================================== */
export interface RobotFace { accentColor: string; bodyColor?: string | null; outlineColor?: string | null }

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toRgb = (hex: string) => {
  const h = (hex || '#888888').replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16) || 0, g: parseInt(h.slice(2, 4), 16) || 0, b: parseInt(h.slice(4, 6), 16) || 0 };
};
const toHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
export function shade(hex: string, amount: number): string {
  const { r, g, b } = toRgb(hex);
  const t = amount < 0 ? 0 : 255; const p = Math.abs(amount);
  return toHex({ r: r + (t - r) * p, g: g + (t - g) * p, b: b + (t - b) * p });
}

let uid = 0;

export function robotMascotSvg(face: RobotFace, size = 96): string {
  const accent = face.accentColor || '#7ecb98';
  const body = face.bodyColor || shade(accent, 0.62);
  const outline = face.outlineColor || shade(accent, -0.62);
  const bodyHi = shade(body, 0.22);
  const bodyLo = shade(body, -0.14);
  const eyeGlow = shade(accent, 0.25);
  const id = `rm${++uid}`;
  const w = Math.round(size);
  const hgt = Math.round(size * 132 / 120);
  return `
<svg viewBox="0 0 120 132" width="${w}" height="${hgt}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Robot">
  <defs>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bodyHi}"/><stop offset="1" stop-color="${bodyLo}"/>
    </linearGradient>
    <radialGradient id="${id}e" cx="0.42" cy="0.36" r="0.75">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.34" stop-color="${eyeGlow}"/>
      <stop offset="1" stop-color="${shade(accent, -0.28)}"/>
    </radialGradient>
    <filter id="${id}g" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <line x1="60" y1="24" x2="60" y2="12" stroke="${outline}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="60" cy="9" r="7" fill="url(#${id}e)" stroke="${outline}" stroke-width="2.5" filter="url(#${id}g)"/>
  <rect x="9" y="58" width="12" height="30" rx="6" fill="${bodyLo}" stroke="${outline}" stroke-width="4"/>
  <rect x="99" y="58" width="12" height="30" rx="6" fill="${bodyLo}" stroke="${outline}" stroke-width="4"/>
  <circle cx="15" cy="73" r="2.4" fill="${accent}"/><circle cx="105" cy="73" r="2.4" fill="${accent}"/>
  <rect x="18" y="26" width="84" height="86" rx="26" fill="url(#${id}b)" stroke="${outline}" stroke-width="5"/>
  <rect x="26" y="33" width="30" height="14" rx="7" fill="#ffffff" opacity="0.14"/>
  <rect x="29" y="45" width="62" height="46" rx="20" fill="#0c1420" stroke="${shade(outline, 0.12)}" stroke-width="2.5"/>
  <circle cx="47" cy="66" r="10" fill="url(#${id}e)" filter="url(#${id}g)"/>
  <circle cx="73" cy="66" r="10" fill="url(#${id}e)" filter="url(#${id}g)"/>
  <circle cx="44.5" cy="63" r="2.6" fill="#ffffff"/><circle cx="70.5" cy="63" r="2.6" fill="#ffffff"/>
  <path d="M50 82 Q60 89 70 82" stroke="${accent}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9"/>
  <rect x="44" y="110" width="32" height="10" rx="5" fill="${bodyLo}" stroke="${outline}" stroke-width="4"/>
</svg>`.trim();
}
