import { Container } from 'pixi.js';
import type { Card, EngineView, Seat } from 'belote-core';
import { CardSprite } from './CardSprite';
import type { CardAtlas } from './cardAtlas';
import { displaySort } from '../handSort';
import type { PixiTableTheme } from '../theme';
import { type Dir, type Rect } from './geometry';

/** Geometry of one displayed fan — lets other layers anchor things to the hand. */
export interface FanMetrics {
  /** World anchor point of the fan group (its pivot lands here). */
  ax: number; ay: number;
  /** Group rotation (0 south, π north, ±π/2 sides). */
  rot: number;
  totalW: number; cardW: number; cardH: number;
}

/**
 * HandsLayer — design-system Hand:
 * fanned hand with per-card splay: rot = (i - mid) * 3°, rise = -(i-mid)² * 1.4,
 * overlap 32px (md). The WHOLE hand is rotated per seat (north 180°, west 90°,
 * east -90°) and anchored 62px inside the felt. Hover lifts 14px.
 */
export class HandsLayer extends Container {
  /** Fan geometry of the LAST update, keyed by relative direction. */
  readonly metrics = new Map<Dir, FanMetrics>();
  constructor(private theme: PixiTableTheme) { super(); }
  setTheme(t: PixiTableTheme) { this.theme = t; }

  update(
    hands: (Card[] | null)[], legal: Card[], view: EngineView, mySeat: Seat,
    rect: Rect, atlas: CardAtlas, cardW: number, onPlay: (card: Card) => void, partnerFaceDown = false,
  ) {
    this.removeChildren();
    this.metrics.clear();
    const dirs: Dir[] = ['south', 'west', 'north', 'east'];
    const mode = this.theme.opponentCards;

    for (let rel = 0; rel < 4; rel++) {
      const seat = ((mySeat + rel) % 4) as Seat;
      const dir = dirs[rel];
      const cards = hands[seat];
      const count = cards?.length ?? 0;
      if (!count) continue;
      if (rel !== 0 && mode === 'hidden') continue;

      const interactive = rel === 0;
      // rel 2 = the partner (across the table): face-down in play mode, whatever the debug mode.
      const faceUp = interactive || (mode === 'faceup' && !!cards && !(rel === 2 && partnerFaceDown));
      const shown = faceUp && cards ? displaySort(cards, view.trump) : cards!;
      this.drawFan(dir, shown, count, faceUp, interactive, legal, view, mySeat, rect, atlas, cardW, onPlay);
    }
  }

  private drawFan(
    dir: Dir, cards: Card[], count: number, faceUp: boolean, interactive: boolean,
    legal: Card[], view: EngineView, mySeat: Seat, rect: Rect, atlas: CardAtlas,
    cardW: number, onPlay: (card: Card) => void,
  ) {
    const cardH = Math.round(cardW * (atlas.cardH / atlas.cardW));
    const legalSet = new Set(legal.map((c) => `${c.rank}${c.suit}`));
    const myTurn = interactive && view.phase === 'playing' && view.turn === mySeat && !view.awaitingCollect;

    // Overlap 32/68 of card width (DS md), clamped so the fan fits its side.
    const along = (dir === 'south' || dir === 'north') ? rect.w : rect.h;
    let overlap = cardW * (32 / 68);
    const maxTotal = along - cardW - 120;
    let step = cardW - overlap;
    if (count > 1 && cardW + (count - 1) * step > maxTotal) step = Math.max(10, (maxTotal - cardW) / (count - 1));
    const totalW = cardW + (count - 1) * step;

    // The hand group: cards laid out horizontally, then the group rotated per seat.
    const group = new Container();
    const mid = (count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const t = i - mid;
      const cv = new CardSprite(atlas, faceUp ? cards[i] : null, faceUp, cardW, this.theme.accent2, this.theme.accent2);
      cv.pivot.set(cardW / 2, cardH); // splay around the bottom-center like the DS transform-origin 50% 100%
      const bx = i * step + cardW / 2;
      const by = cardH - Math.pow(t, 2) * 1.4; // subtle arc rise
      cv.position.set(bx, by);
      cv.rotation = (t * 3 * Math.PI) / 180;

      if (interactive) {
        const playable = myTurn && legalSet.has(`${cards[i].rank}${cards[i].suit}`);
        cv.setPlayable(playable);
        cv.setDimmed(myTurn && !playable);
        if (playable) {
          const c = cards[i];
          cv.on('pointertap', () => onPlay(c));
          cv.on('pointerover', () => { cv.y = by - 14; });   // DS fan-rise 14px
          cv.on('pointerout', () => { cv.y = by; });
        }
      }
      group.addChild(cv);
    }
    group.pivot.set(totalW / 2, cardH);

    // Anchor 62px inside the felt on the seat's side; rotate the whole group.
    const INSET = 62;
    if (dir === 'south') {
      group.position.set(rect.x + rect.w / 2, rect.y + rect.h - INSET);
    } else if (dir === 'north') {
      group.rotation = Math.PI;
      group.position.set(rect.x + rect.w / 2, rect.y + INSET);
    } else if (dir === 'west') {
      group.rotation = Math.PI / 2;
      group.position.set(rect.x + INSET, rect.y + rect.h / 2);
    } else {
      group.rotation = -Math.PI / 2;
      group.position.set(rect.x + rect.w - INSET, rect.y + rect.h / 2);
    }
    this.metrics.set(dir, { ax: group.position.x, ay: group.position.y, rot: group.rotation, totalW, cardW, cardH });
    this.addChild(group);
  }
}
