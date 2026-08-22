/* =============================================================================
 * TABLE-PIXI · robotMascot.ts — Mascotte PARAMÉTRIQUE (SVG) + rasterisation.
 * -----------------------------------------------------------------------------
 * v19 — Un générateur unique dessine DEUX familles de mascottes à partir de
 * quelques paramètres :
 *   • `robot`  — tête plaquée, visière, 1 à 5 ANTENNES, gros yeux lumineux.
 *   • `human`  — tête RONDE, CHEVEUX (1 à 5 mèches), oreilles douces, petits yeux.
 * Communs aux deux : couleurs (accent / corps / contour), nombre d'antennes ou
 * mèches (1..5), ÉTAT DES YEUX (ouvert, grand, fermé, clin/fermé/grand gauche ou
 * droite) et ÉTAT DE LA BOUCHE (sourire, neutre, triste, colère, rictus, surpris).
 *
 * `mascotTexture` rasterise le SVG en Texture Pixi (cache + chargement async)
 * pour servir de logo de siège sur la table.
 * ========================================================================== */
import { Texture } from 'pixi.js';

export type MascotKind = 'robot' | 'human';
export type EyeState =
  | 'open' | 'wide' | 'closed'
  | 'wink-left' | 'wink-right'
  | 'closed-left' | 'closed-right'
  | 'wide-left' | 'wide-right';
export type MouthState = 'smile' | 'grin' | 'neutral' | 'sad' | 'angry' | 'surprised';

export interface MascotFace {
  /** Famille visuelle. Défaut : `robot`. */
  kind?: MascotKind;
  accentColor: string;
  bodyColor?: string | null;
  outlineColor?: string | null;
  /** Nombre d'antennes (robot) ou de mèches (humain), 1..5. Défaut 1. */
  antennas?: number;
  /** État des yeux. Défaut `open`. */
  eyes?: EyeState;
  /** État de la bouche. Défaut `smile`. */
  mouth?: MouthState;
}
/** Rétrocompat : ancien nom. */
export type RobotFace = MascotFace;

/** Listes d'états proposées au back-office (source de vérité partagée). */
export const MASCOT_EYE_STATES: EyeState[] = ['open', 'wide', 'closed', 'wink-left', 'wink-right', 'closed-left', 'closed-right', 'wide-left', 'wide-right'];
export const MASCOT_MOUTH_STATES: MouthState[] = ['smile', 'grin', 'neutral', 'sad', 'angry', 'surprised'];

/* ── Maths de couleur (hex #rrggbb) ───────────────────────────────────────── */
const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toRgb = (hex: string) => {
  const h = (hex || '#888888').replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16) || 0, g: parseInt(h.slice(2, 4), 16) || 0, b: parseInt(h.slice(4, 6), 16) || 0 };
};
const toHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g).toString(16).padStart(2, '0')}${clampByte(b).toString(16).padStart(2, '0')}`;
export function shade(hex: string, amount: number): string {
  const { r, g, b } = toRgb(hex);
  const t = amount < 0 ? 0 : 255; const p = Math.abs(amount);
  return toHex({ r: r + (t - r) * p, g: g + (t - g) * p, b: b + (t - b) * p });
}

const clampN = (v: number | undefined, min: number, max: number, def: number) =>
  (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : def);

/** Traduit un état global en état par œil : [gauche(spectateur), droite]. */
function eyePair(state: EyeState | undefined): ['open' | 'wide' | 'closed', 'open' | 'wide' | 'closed'] {
  switch (state) {
    case 'wide': return ['wide', 'wide'];
    case 'closed': return ['closed', 'closed'];
    case 'wink-left': case 'closed-left': return ['closed', 'open'];
    case 'wink-right': case 'closed-right': return ['open', 'closed'];
    case 'wide-left': return ['wide', 'open'];
    case 'wide-right': return ['open', 'wide'];
    default: return ['open', 'open'];
  }
}

/** Un œil. `robot` = pastille lumineuse ; `human` = sclère + iris + pupille. */
function renderEye(cx: number, cy: number, r: number, st: 'open' | 'wide' | 'closed', kind: MascotKind, accent: string, outline: string, eyeGradId: string, glowId: string): string {
  if (st === 'closed') {
    const w = Math.max(2, r * 0.42);
    return `<path d="M${cx - r} ${cy - 0.5} Q${cx} ${cy + r * 0.85} ${cx + r} ${cy - 0.5}" stroke="${outline}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  }
  const rr = st === 'wide' ? r * 1.34 : r;
  if (kind === 'robot') {
    return `<circle cx="${cx}" cy="${cy}" r="${rr.toFixed(1)}" fill="url(#${eyeGradId})" filter="url(#${glowId})"/>`
      + `<circle cx="${(cx - rr * 0.25).toFixed(1)}" cy="${(cy - rr * 0.3).toFixed(1)}" r="${(rr * 0.26).toFixed(1)}" fill="#ffffff"/>`;
  }
  // humain : blanc de l'œil + iris teinté + pupille + reflet.
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rr.toFixed(1)}" ry="${(rr * 1.12).toFixed(1)}" fill="#ffffff" stroke="${outline}" stroke-width="1.4"/>`
    + `<circle cx="${cx}" cy="${(cy + rr * 0.08).toFixed(1)}" r="${(rr * 0.6).toFixed(1)}" fill="${shade(accent, -0.5)}"/>`
    + `<circle cx="${cx}" cy="${(cy + rr * 0.08).toFixed(1)}" r="${(rr * 0.3).toFixed(1)}" fill="#0c1420"/>`
    + `<circle cx="${(cx - rr * 0.22).toFixed(1)}" cy="${(cy - rr * 0.24).toFixed(1)}" r="${(rr * 0.17).toFixed(1)}" fill="#ffffff"/>`;
}

/** La bouche selon son état. `mx,my` = centre, `w` = largeur. */
function renderMouth(mx: number, my: number, w: number, st: MouthState | undefined, accent: string, outline: string): string {
  const half = w / 2;
  const stroke = `stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round"`;
  switch (st) {
    case 'neutral':
      return `<path d="M${mx - half} ${my} L${mx + half} ${my}" ${stroke}/>`;
    case 'sad':
      return `<path d="M${mx - half} ${my + 4} Q${mx} ${my - 6} ${mx + half} ${my + 4}" ${stroke}/>`;
    case 'angry':
      // rictus tendu vers le bas (les sourcils, dessinés à part, complètent la colère).
      return `<path d="M${mx - half} ${my + 5} Q${mx} ${my - 4} ${mx + half} ${my + 5}" stroke="${shade(accent, -0.15)}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'surprised':
      return `<ellipse cx="${mx}" cy="${my}" rx="${(w * 0.24).toFixed(1)}" ry="${(w * 0.3).toFixed(1)}" fill="#0c1420" stroke="${outline}" stroke-width="1.5"/>`;
    case 'grin':
      return `<path d="M${mx - half} ${my - 2} Q${mx} ${my + half * 0.95} ${mx + half} ${my - 2} Z" fill="#0c1420" stroke="${outline}" stroke-width="1.5"/>`
        + `<path d="M${mx - half + 2} ${my - 1} Q${mx} ${my + 3} ${mx + half - 2} ${my - 1}" stroke="#ffffff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    default: // smile
      return `<path d="M${mx - half} ${my - 2} Q${mx} ${my + 5} ${mx + half} ${my - 2}" ${stroke}/>`;
  }
}

/** Sourcils fâchés (colère) — deux traits inclinés vers le centre. */
function angryBrows(lx: number, rx: number, y: number, outline: string): string {
  return `<path d="M${lx - 8} ${y - 2} L${lx + 6} ${y + 3}" stroke="${outline}" stroke-width="3.4" stroke-linecap="round"/>`
    + `<path d="M${rx + 8} ${y - 2} L${rx - 6} ${y + 3}" stroke="${outline}" stroke-width="3.4" stroke-linecap="round"/>`;
}

/* ── Familles ──────────────────────────────────────────────────────────────── */

/** Antennes du robot (1..5), réparties sur le sommet de la tête plaquée. */
function robotAntennas(n: number, outline: string, eyeGradId: string, glowId: string): string {
  let s = '';
  const spread = 15;
  const rBulb = n === 1 ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const off = i - (n - 1) / 2;
    const bx = 60 + off * spread;
    const tipx = 60 + off * (spread + 4);
    const tipy = 12 - Math.abs(off) * 2;
    s += `<line x1="${bx.toFixed(1)}" y1="26" x2="${tipx.toFixed(1)}" y2="${(tipy + 3).toFixed(1)}" stroke="${outline}" stroke-width="4" stroke-linecap="round"/>`;
    s += `<circle cx="${tipx.toFixed(1)}" cy="${tipy.toFixed(1)}" r="${rBulb}" fill="url(#${eyeGradId})" stroke="${outline}" stroke-width="2.2" filter="url(#${glowId})"/>`;
  }
  return s;
}

/** Mèches de cheveux (1..5) rayonnant du sommet de la tête ronde. */
function humanHair(n: number, accent: string): string {
  const cx = 60, cy = 68, r = 40;
  const hi = shade(accent, 0.18);
  // Calotte capillaire (couvre le haut du crâne).
  let s = `<path d="M${cx - 38} 64 A40 40 0 0 1 ${cx + 38} 64 Q${cx} 50 ${cx - 38} 64 Z" fill="${accent}"/>`;
  const spanDeg = n === 1 ? 0 : 96;
  for (let i = 0; i < n; i++) {
    const aDeg = n === 1 ? 0 : -spanDeg / 2 + (spanDeg * i) / (n - 1);
    const a = (aDeg * Math.PI) / 180;
    const sinA = Math.sin(a), cosA = Math.cos(a);
    const bx = cx + r * sinA, by = cy - r * cosA;
    const tx = cx + (r + 15) * sinA, ty = cy - (r + 15) * cosA;
    const wx = cosA * 6, wy = sinA * 6; // largeur perpendiculaire au rayon
    const tint = i % 2 === 0 ? accent : hi;
    s += `<path d="M${(bx - wx).toFixed(1)} ${(by - wy).toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)} L${(bx + wx).toFixed(1)} ${(by + wy).toFixed(1)} Z" fill="${tint}"/>`;
  }
  return s;
}

/* ── Générateur principal ──────────────────────────────────────────────────── */

let uid = 0;

/** SVG de la mascotte (robot ou humain). */
export function mascotSvg(face: MascotFace, size = 96): string {
  const kind: MascotKind = face.kind === 'human' ? 'human' : 'robot';
  const accent = face.accentColor || (kind === 'human' ? '#4f8ce0' : '#7ecb98');
  const body = face.bodyColor || shade(accent, 0.62);
  const outline = face.outlineColor || shade(accent, -0.62);
  const bodyHi = shade(body, 0.22);
  const bodyLo = shade(body, -0.14);
  const eyeGlow = shade(accent, 0.25);
  const n = clampN(face.antennas, 1, 5, 1);
  const [eyeL, eyeR] = eyePair(face.eyes);
  const mouth = face.mouth ?? 'smile';
  const id = `m${++uid}`;
  const w = Math.round(size);
  const hgt = Math.round(size * 132 / 120);

  const defs = `
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
  </defs>`;

  let inner = '';
  if (kind === 'human') {
    // Oreilles douces (derrière la tête), tête ronde, cheveux, visage.
    inner += `<ellipse cx="18" cy="70" rx="7" ry="10" fill="${bodyLo}" stroke="${outline}" stroke-width="4"/>`;
    inner += `<ellipse cx="102" cy="70" rx="7" ry="10" fill="${bodyLo}" stroke="${outline}" stroke-width="4"/>`;
    inner += `<circle cx="60" cy="68" r="40" fill="url(#${id}b)" stroke="${outline}" stroke-width="5"/>`;
    inner += humanHair(n, accent);
    // Reflet doux sur le front.
    inner += `<ellipse cx="46" cy="52" rx="12" ry="6" fill="#ffffff" opacity="0.12"/>`;
    if (mouth === 'angry') inner += angryBrows(48, 72, 58, outline);
    // Petits yeux (r=6.5), sous les sourcils.
    inner += renderEye(48, 68, 6.5, eyeL, kind, accent, outline, `${id}e`, `${id}g`);
    inner += renderEye(72, 68, 6.5, eyeR, kind, accent, outline, `${id}e`, `${id}g`);
    // Nez discret.
    inner += `<path d="M60 74 q3 4 0 7" stroke="${shade(outline, 0.1)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    inner += renderMouth(60, 90, 18, mouth, accent, outline);
    // Col.
    inner += `<path d="M40 108 Q60 122 80 108" fill="${bodyLo}" stroke="${outline}" stroke-width="4"/>`;
  } else {
    // Robot : antennes, oreilles/boulons, tête plaquée, visière, yeux, bouche.
    inner += robotAntennas(n, outline, `${id}e`, `${id}g`);
    inner += `<rect x="9" y="58" width="12" height="30" rx="6" fill="${bodyLo}" stroke="${outline}" stroke-width="4"/>`;
    inner += `<rect x="99" y="58" width="12" height="30" rx="6" fill="${bodyLo}" stroke="${outline}" stroke-width="4"/>`;
    inner += `<circle cx="15" cy="73" r="2.4" fill="${accent}"/><circle cx="105" cy="73" r="2.4" fill="${accent}"/>`;
    inner += `<rect x="18" y="26" width="84" height="86" rx="26" fill="url(#${id}b)" stroke="${outline}" stroke-width="5"/>`;
    inner += `<rect x="26" y="33" width="30" height="14" rx="7" fill="#ffffff" opacity="0.14"/>`;
    inner += `<rect x="29" y="45" width="62" height="46" rx="20" fill="#0c1420" stroke="${shade(outline, 0.12)}" stroke-width="2.5"/>`;
    if (mouth === 'angry') inner += angryBrows(47, 73, 55, accent);
    inner += renderEye(47, 66, 10, eyeL, kind, accent, outline, `${id}e`, `${id}g`);
    inner += renderEye(73, 66, 10, eyeR, kind, accent, outline, `${id}e`, `${id}g`);
    inner += renderMouth(60, 84, 20, mouth, accent, outline);
    inner += `<rect x="44" y="110" width="32" height="10" rx="5" fill="${bodyLo}" stroke="${outline}" stroke-width="4"/>`;
  }

  return `
<svg viewBox="0 0 120 132" width="${w}" height="${hgt}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${kind === 'human' ? 'Avatar joueur' : 'Robot'}">
  ${defs}
  ${inner}
</svg>`.trim();
}

/** Rétrocompat : ancien point d'entrée (rendu robot par défaut). */
export function robotMascotSvg(face: RobotFace, size = 96): string {
  return mascotSvg(face, size);
}

/** Signature stable d'une face (clé de cache). */
export function faceKey(face: MascotFace): string {
  return [face.kind ?? 'robot', face.accentColor, face.bodyColor ?? '', face.outlineColor ?? '', face.antennas ?? 1, face.eyes ?? 'open', face.mouth ?? 'smile'].join('|');
}

const texCache = new Map<string, Texture>();

/**
 * Rasterise la mascotte en Texture Pixi. Retourne la texture si déjà en cache
 * (synchrone), sinon lance le chargement et appelle `onReady` quand prête —
 * le prochain rendu de la table piochera la texture du cache.
 */
export function mascotTexture(face: MascotFace, px = 96, onReady?: () => void): Texture | null {
  const key = `${faceKey(face)}@${px}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  try {
    const svg = mascotSvg(face, px);
    const img = new Image();
    img.onload = () => {
      try {
        const dpr = Math.min(2, (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1);
        const cv = document.createElement('canvas');
        cv.width = Math.round(px * dpr); cv.height = Math.round(px * 132 / 120 * dpr);
        const ctx = cv.getContext('2d')!;
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        texCache.set(key, Texture.from(cv));
        onReady?.();
      } catch { /* rasterisation impossible : on garde le repli */ }
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch { /* pas de DOM (SSR/tests) */ }
  return null;
}
