import { Container, Graphics, Sprite } from 'pixi.js';
import type { Card } from 'belote-core';
import type { CardAtlas } from './cardAtlas';

/**
 * CardSprite — one on-table card (a Sprite from the pre-rendered atlas) with the
 * design-system play states:
 *   playable    → 2px accent ring (rgba ~0.85) hugging the card
 *   nonplayable → desaturated + darkened (tint grey, DS: saturate(.35) brightness(.75))
 *   winner      → 2px accent-2 ring + wide soft glow
 * Shadows are baked light; hover lift (−14px) is driven by the hand layer.
 */
export class CardSprite extends Container {
  readonly card: Card | null;
  private sprite: Sprite;
  private glow = new Graphics();
  private w: number; private h: number; private r: number;
  private accent: number; private accent2: number;

  constructor(atlas: CardAtlas, card: Card | null, faceUp: boolean, width: number, accent = 0xf0c46a, accent2 = 0xffe28a) {
    super();
    this.card = card;
    this.w = width;
    this.h = Math.round(width * (atlas.cardH / atlas.cardW));
    this.r = Math.round(width * (10 / 68)); // DS radius ratio
    this.accent = accent; this.accent2 = accent2;
    this.sprite = new Sprite(atlas.get(faceUp && card ? card : 'back'));
    this.sprite.width = this.w; this.sprite.height = this.h;
    // Soft rest shadow.
    const sh = new Graphics();
    sh.roundRect(1, 2, this.w, this.h, this.r).fill({ color: 0x000000, alpha: 0.28 });
    this.addChild(sh, this.glow, this.sprite);
  }

  get cardWidth() { return this.w; }
  get cardHeight() { return this.h; }

  setPlayable(on: boolean) {
    this.glow.clear();
    if (on) {
      this.glow.roundRect(-2, -2, this.w + 4, this.h + 4, this.r + 2).stroke({ width: 2, color: this.accent, alpha: 0.85 });
      this.eventMode = 'static'; this.cursor = 'pointer';
    } else { this.eventMode = 'none'; this.cursor = 'default'; }
  }

  setWinning(on: boolean) {
    if (!on) return;
    this.glow.roundRect(-2, -2, this.w + 4, this.h + 4, this.r + 2).stroke({ width: 2, color: this.accent2, alpha: 1 });
    this.glow.roundRect(-8, -8, this.w + 16, this.h + 16, this.r + 8).stroke({ width: 10, color: this.accent2, alpha: 0.20 });
  }

  /** DS nonplayable: saturate(0.35) brightness(0.75) ≈ grey-dark tint. */
  setDimmed(on: boolean) {
    this.sprite.tint = on ? 0x9a9a9a : 0xffffff;
    this.alpha = on ? 0.92 : 1;
  }
}
