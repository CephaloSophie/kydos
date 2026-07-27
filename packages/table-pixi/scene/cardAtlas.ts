import { Texture } from 'pixi.js';
import type { Card, Suit } from 'belote-core';

export const SUIT_SYMBOL: Record<Suit, string> = { pique: '♠', coeur: '♥', carreau: '♦', trefle: '♣' };
export const isRedSuit = (s: Suit) => s === 'coeur' || s === 'carreau';

const RANKS = ['7', '8', '9', '10', 'V', 'D', 'R', 'A'];
const SUITS: Suit[] = ['pique', 'coeur', 'carreau', 'trefle'];

/** Design-system card geometry (tokens/spacing.css): md 68×96, radius 10. */
export const CARD_W = 68;
export const CARD_H = 96;
export const CARD_RADIUS = 10;

/** Design-system card colors (tokens/colors.css + PlayingCard.jsx). */
export const CARD_STYLE = {
  face: '#ffffff',
  suitRed: '#c41e3a',
  suitBlack: '#0a0a0a',
  backHi: '#6b78ea',       // back gradient top
  backLo: '#2a3196',       // back gradient bottom
  backStripe: 'rgba(255,255,255,0.15)',
  backBorder: 'rgba(255,255,255,0.85)',
  fontUi: '"Manrope", ui-sans-serif, system-ui, sans-serif',
  fontDisplay: '"Playfair Display", ui-serif, Georgia, serif',
};

const key = (c: Card | 'back') => (c === 'back' ? 'back' : `${c.rank}${c.suit}`);

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * CardAtlas — the 32 faces + back pre-rendered ONCE on crisp 2D canvases
 * (design-system PlayingCard spec: white face, Manrope corners, Playfair big pip,
 * indigo striped back with white border). Exposed as Pixi Textures; on-screen
 * cards are plain Sprites — pixel-perfect at any zoom, zero ink bleed.
 */
export class CardAtlas {
  private textures = new Map<string, Texture>();
  readonly cardW = CARD_W;
  readonly cardH = CARD_H;

  constructor(dpr = 3) {
    for (const suit of SUITS) for (const rank of RANKS) {
      const card = { rank, suit } as Card;
      this.textures.set(key(card), this.renderFace(card, dpr));
    }
    this.textures.set('back', this.renderBack(dpr));
  }

  get(card: Card | 'back'): Texture { return this.textures.get(key(card)) ?? this.textures.get('back')!; }
  destroy() { for (const t of this.textures.values()) t.destroy(true); this.textures.clear(); }

  private canvas(dpr: number) {
    const cv = document.createElement('canvas');
    cv.width = CARD_W * dpr; cv.height = CARD_H * dpr;
    const ctx = cv.getContext('2d')!;
    ctx.scale(dpr, dpr);
    return { cv, ctx };
  }

  /** Face: white card, TL/BR corners (rank 800 14px over suit 12px), big Playfair pip 42px. */
  private renderFace(card: Card, dpr: number): Texture {
    const { cv, ctx } = this.canvas(dpr);
    const S = CARD_STYLE;
    const color = isRedSuit(card.suit) ? S.suitRed : S.suitBlack;
    const sym = SUIT_SYMBOL[card.suit];

    ctx.save();
    roundRect(ctx, 0, 0, CARD_W, CARD_H, CARD_RADIUS);
    ctx.fillStyle = S.face; ctx.fill();
    ctx.clip();

    // Top-left corner: rank over suit, centered as a column at x≈6+w/2.
    ctx.fillStyle = color;
    ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.font = `800 14px ${S.fontUi}`;
    const colX = 6 + 7; // corner column center
    ctx.fillText(card.rank, colX, 5);
    ctx.font = `500 12px ${S.fontUi}`;
    ctx.fillText(sym, colX, 5 + 14 + 1);

    // Big center pip — Playfair Display 900 42px, optically centered.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 42px ${S.fontDisplay}`;
    ctx.fillText(sym, CARD_W / 2, CARD_H / 2 + 2);

    // Bottom-right corner, rotated 180°.
    ctx.save();
    ctx.translate(CARD_W - colX, CARD_H - 5);
    ctx.rotate(Math.PI);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `800 14px ${S.fontUi}`;
    ctx.fillText(card.rank, 0, 0);
    ctx.font = `500 12px ${S.fontUi}`;
    ctx.fillText(sym, 0, 15);
    ctx.restore();
    ctx.restore();
    return Texture.from(cv);
  }

  /** Back: white card body, inset(3px) indigo panel with 45° white stripes + white border. */
  private renderBack(dpr: number): Texture {
    const { cv, ctx } = this.canvas(dpr);
    const S = CARD_STYLE;

    // Card body (white) so the inset panel reads like the DS spec.
    roundRect(ctx, 0, 0, CARD_W, CARD_H, CARD_RADIUS);
    ctx.fillStyle = '#ffffff'; ctx.fill();

    // Inset panel.
    const ix = 3, iy = 3, iw = CARD_W - 6, ih = CARD_H - 6, ir = 7;
    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, ir);
    ctx.clip();
    // Vertical gradient backHi → backLo.
    const grad = ctx.createLinearGradient(0, iy, 0, iy + ih);
    grad.addColorStop(0, S.backHi); grad.addColorStop(1, S.backLo);
    ctx.fillStyle = grad; ctx.fillRect(ix, iy, iw, ih);
    // 45° white stripes: 4px stripe, 6px gap (repeating 10px period).
    ctx.strokeStyle = S.backStripe; ctx.lineWidth = 4;
    for (let d = -ih; d < iw + ih; d += 10) {
      ctx.beginPath(); ctx.moveTo(ix + d, iy); ctx.lineTo(ix + d + ih, iy + ih); ctx.stroke();
    }
    ctx.restore();
    // White border of the panel.
    roundRect(ctx, ix + 1, iy + 1, iw - 2, ih - 2, ir);
    ctx.lineWidth = 2; ctx.strokeStyle = S.backBorder; ctx.stroke();
    return Texture.from(cv);
  }
}

/** Waits for the atlas fonts, then resolves (best effort — falls back silently). */
export async function loadAtlasFonts(): Promise<void> {
  try {
    await Promise.all([
      (document as any).fonts?.load('800 14px "Manrope"'),
      (document as any).fonts?.load('900 42px "Playfair Display"'),
    ]);
  } catch { /* fallback fonts are fine */ }
}
