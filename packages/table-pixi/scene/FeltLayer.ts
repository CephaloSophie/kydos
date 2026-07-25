import { Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { EngineView } from 'belote-core';
import { SUIT_SYMBOL, isRedSuit } from './cardAtlas';
import type { PixiTableTheme } from '../theme';
import type { Rect } from './geometry';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

const wmStyle = (size: number, color: number, alpha: number) => {
  const t = new Text({ text: '', style: new TextStyle({ fill: color, fontSize: size, fontFamily: '"Playfair Display", Georgia, serif', fontWeight: '900' }) });
  t.anchor.set(0.5); t.alpha = alpha;
  return t;
};

/**
 * FeltLayer — the table background rendered as ONE 2D-canvas texture with the
 * REAL design-system gradients (no ellipse hacks):
 * - rail: vertical linear gradient railHi → rail (45%) → railLo + inner ring;
 * - felt: radial-gradient 140%×100% at 50% 45%, felt1 → felt2;
 * - vignette: strong inner shadow.
 * The texture is rebuilt on resize/theme change. Watermark stays as Pixi Text.
 */
export class FeltLayer extends Container {
  private bg: Sprite;
  private center: Text;
  private corners: Text[] = [];
  private key = '';

  constructor(private theme: PixiTableTheme) {
    super();
    this.bg = new Sprite(Texture.EMPTY);
    this.addChild(this.bg);
    this.center = wmStyle(240, 0xffffff, 0.06);
    this.addChild(this.center);
    for (let i = 0; i < 4; i++) { const c = wmStyle(42, 0xffffff, 0.06); this.corners.push(c); this.addChild(c); }
  }

  setTheme(t: PixiTableTheme) { this.theme = t; }

  /** Rail padding follows the DS responsive breakpoints. */
  static railPad(viewW: number): number { return viewW > 1200 ? 22 : viewW > 860 ? 14 : 8; }

  layout(rect: Rect, viewW: number) {
    const t = this.theme;
    const pad = FeltLayer.railPad(viewW);
    const railR = viewW > 1200 ? 28 : viewW > 860 ? 20 : 14;
    const feltR = viewW > 1200 ? 22 : viewW > 860 ? 16 : 10;
    const w = Math.max(2, Math.round(rect.w + pad * 2));
    const h = Math.max(2, Math.round(rect.h + pad * 2));
    const key = `${t.name}:${w}x${h}`;
    if (key !== this.key) {
      this.key = key;
      const old = this.bg.texture;
      this.bg.texture = this.renderBackground(w, h, pad, railR, feltR);
      if (old !== Texture.EMPTY) old.destroy(true);
    }
    this.bg.position.set(rect.x - pad, rect.y - pad);
    this.bg.width = w; this.bg.height = h;
  }

  private renderBackground(w: number, h: number, pad: number, railR: number, feltR: number): Texture {
    const t = this.theme;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const rr = (x: number, y: number, W: number, H: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + W, y, x + W, y + H, r);
      ctx.arcTo(x + W, y + H, x, y + H, r);
      ctx.arcTo(x, y + H, x, y, r);
      ctx.arcTo(x, y, x + W, y, r);
      ctx.closePath();
    };

    // --- Rail: real vertical gradient railHi → rail (45%) → railLo ---
    const rail = ctx.createLinearGradient(0, 0, 0, h);
    rail.addColorStop(0, hex(t.railHi));
    rail.addColorStop(0.45, hex(t.rail));
    rail.addColorStop(1, hex(t.railLo));
    rr(0, 0, w, h, railR);
    ctx.fillStyle = rail; ctx.fill();
    // Inner dark ring of the rail.
    rr(1.5, 1.5, w - 3, h - 3, railR - 1);
    ctx.lineWidth = 2; ctx.strokeStyle = hex(t.railInner); ctx.stroke();

    // --- Felt: REAL radial gradient 140%×100% at 50% 45% ---
    const fx = pad, fy = pad, fw = w - pad * 2, fh = h - pad * 2;
    ctx.save();
    rr(fx, fy, fw, fh, feltR);
    ctx.clip();
    const cx = fx + fw * 0.5, cy = fy + fh * 0.45;
    const rMax = Math.sqrt(Math.pow(fw * 0.7, 2) + Math.pow(fh * 0.5, 2));
    // Emulate the 140%×100% ellipse with a scaled circular gradient.
    ctx.translate(cx, cy);
    ctx.scale(1.4, 1);
    const felt = ctx.createRadialGradient(0, 0, 0, 0, 0, rMax);
    felt.addColorStop(0, hex(t.felt1));
    felt.addColorStop(1, hex(t.felt2));
    ctx.fillStyle = felt;
    ctx.fillRect(-cx / 1.4 - fw, -cy - fh, (fw + cx) * 3, (fh + cy) * 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Vignette: inner shadow (inset 0 0 90px black 0.55) via radial alpha ring.
    const vig = ctx.createRadialGradient(fx + fw / 2, fy + fh / 2, Math.min(fw, fh) * 0.32, fx + fw / 2, fy + fh / 2, Math.max(fw, fh) * 0.62);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(fx, fy, fw, fh);
    ctx.restore();
    return Texture.from(cv);
  }

  update(trump: EngineView['trump'], rect: Rect) {
    const show = !!trump;
    this.center.visible = show;
    this.corners.forEach((c) => (c.visible = show));
    if (!show) return;
    const sym = SUIT_SYMBOL[trump!];
    const red = isRedSuit(trump!);
    const color = red ? 0xc41e3a : 0xffffff;
    const alpha = red ? 0.10 : 0.06;
    this.center.text = sym;
    this.center.style.fill = color; this.center.alpha = alpha;
    this.center.style.fontSize = Math.min(240, Math.round(rect.h * 0.42));
    this.center.position.set(rect.x + rect.w / 2, rect.y + rect.h / 2);
    const inset = 16 + 21;
    const pos = [
      { x: rect.x + inset, y: rect.y + inset }, { x: rect.x + rect.w - inset, y: rect.y + inset },
      { x: rect.x + inset, y: rect.y + rect.h - inset }, { x: rect.x + rect.w - inset, y: rect.y + rect.h - inset },
    ];
    this.corners.forEach((c, i) => {
      c.text = sym; c.style.fill = color; c.alpha = alpha * 0.9 + 0.02;
      c.position.set(pos[i].x, pos[i].y);
    });
  }
}
