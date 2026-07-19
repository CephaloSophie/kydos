import { Container, Ticker } from 'pixi.js';
import type { EngineView, Seat } from 'belote-core';
import { CardSprite } from './CardSprite';
import type { CardAtlas } from './cardAtlas';
import type { PixiTableTheme } from '../theme';
import { type Rect } from './geometry';

type DirName = 'south' | 'west' | 'north' | 'east';
const DIRS: DirName[] = ['south', 'west', 'north', 'east'];

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeIn = (p: number) => p * p * p;

/**
 * TrickLayer — design-system TrickArea (220×220 box) with real play animations:
 * - PLAY: a new trick card slides in FROM the owner's hand side (320 ms ease-out,
 *   slight rotation settle), so the player sees exactly WHO played it.
 * - COLLECT: two phases — (1) the four cards gather into a pile at the center
 *   (220 ms), (2) the pile accelerates toward the WINNER's seat, shrinking and
 *   fading (450 ms ease-in). The winner's card glows during the wait.
 */
export class TrickLayer extends Container {
  private animating = false;
  private shown = new Map<string, CardSprite>(); // key -> sprite currently displayed
  private collectKey = '';
  constructor(private theme: PixiTableTheme) { super(); }
  setTheme(t: PixiTableTheme) { this.theme = t; }

  private slots(rect: Rect, cardW: number, cardH: number) {
    const BOX = 220;
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    return {
      south: { x: cx, y: cy + BOX / 2 - cardH / 2, rot: 0 },
      north: { x: cx, y: cy - BOX / 2 + cardH / 2, rot: Math.PI },
      west:  { x: cx - BOX / 2 + cardH / 2, y: cy, rot: Math.PI / 2 },
      east:  { x: cx + BOX / 2 - cardH / 2, y: cy, rot: -Math.PI / 2 },
    };
  }

  /** Where a card COMES FROM: the hand anchor of its seat (62px inside the felt). */
  private handOrigin(dir: DirName, rect: Rect) {
    const INSET = 62;
    switch (dir) {
      case 'south': return { x: rect.x + rect.w / 2, y: rect.y + rect.h - INSET };
      case 'north': return { x: rect.x + rect.w / 2, y: rect.y + INSET };
      case 'west':  return { x: rect.x + INSET, y: rect.y + rect.h / 2 };
      case 'east':  return { x: rect.x + rect.w - INSET, y: rect.y + rect.h / 2 };
    }
  }

  /** Where the collected pile GOES: just beyond the winner's seat. */
  private seatTarget(dir: DirName, rect: Rect) {
    const OUT = 10;
    switch (dir) {
      case 'south': return { x: rect.x + rect.w / 2, y: rect.y + rect.h + OUT };
      case 'north': return { x: rect.x + rect.w / 2, y: rect.y - OUT };
      case 'west':  return { x: rect.x - OUT, y: rect.y + rect.h / 2 };
      case 'east':  return { x: rect.x + rect.w + OUT, y: rect.y + rect.h / 2 };
    }
  }

  update(view: EngineView, mySeat: Seat, rect: Rect, atlas: CardAtlas, cardW: number) {
    if (this.animating) return;
    const cardH = Math.round(cardW * (atlas.cardH / atlas.cardW));
    const slots = this.slots(rect, cardW, cardH);
    const inTrick = new Set<string>();

    // 1) Sync: add NEW cards with a slide-in from their owner's hand.
    for (const { seat, card } of view.currentTrick) {
      const key = `${seat}:${card.rank}${card.suit}`;
      inTrick.add(key);
      if (this.shown.has(key)) continue;
      const rel = ((seat - mySeat + 4) % 4);
      const dir = DIRS[rel];
      const s = slots[dir];
      const cv = new CardSprite(atlas, card, true, cardW, this.theme.accent2, this.theme.accent2);
      cv.pivot.set(cardW / 2, cardH / 2);
      cv.rotation = s.rot;
      const from = this.handOrigin(dir, rect);
      cv.position.set(from.x, from.y);
      this.addChild(cv);
      this.shown.set(key, cv);
      this.animatePlay(cv, from, s);
    }
    // 2) Remove cards that left the trick without a collect (edge cases/replays).
    for (const [key, cv] of [...this.shown]) {
      if (!inTrick.has(key)) { cv.destroy(); this.shown.delete(key); }
    }
    // 3) Winner glow + collect sweep.
    if (view.awaitingCollect && view.pendingWinnerSeat != null) {
      const winnerKey = [...this.shown.keys()].find((k) => k.startsWith(`${view.pendingWinnerSeat}:`));
      if (winnerKey) this.shown.get(winnerKey)!.setWinning(true);
      const ck = JSON.stringify([...inTrick].sort());
      if (ck !== this.collectKey) {
        this.collectKey = ck;
        const rel = ((view.pendingWinnerSeat - mySeat + 4) % 4);
        this.animateCollect(DIRS[rel], rect, cardW, cardH);
      }
    }
  }

  /** Slide-in from the hand: 320 ms ease-out with a small rotation settle. */
  private animatePlay(cv: CardSprite, from: { x: number; y: number }, to: { x: number; y: number; rot: number }) {
    const startRot = to.rot + 0.12;
    cv.rotation = startRot;
    let elapsed = 0;
    const DUR = 320;
    const tick = (t: Ticker) => {
      if (cv.destroyed) { Ticker.shared.remove(tick); return; }
      elapsed += t.deltaMS;
      const p = Math.min(1, elapsed / DUR);
      const e = easeOut(p);
      cv.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      cv.rotation = startRot + (to.rot - startRot) * e;
      if (p >= 1) Ticker.shared.remove(tick);
    };
    Ticker.shared.add(tick);
  }

  /** Collect: gather to the center pile (220 ms), then dart to the winner (450 ms). */
  private animateCollect(dir: DirName, rect: Rect, cardW: number, cardH: number) {
    this.animating = true;
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const target = this.seatTarget(dir, rect);
    const cards = [...this.shown.values()];
    const starts = cards.map((c) => ({ c, sx: c.position.x, sy: c.position.y, sr: c.rotation }));
    const HOLD = 650;   // let the winner glow read
    const GATHER = 220;
    const DART = 450;
    let elapsed = 0;
    const tick = (t: Ticker) => {
      elapsed += t.deltaMS;
      if (elapsed < HOLD) return;
      const t1 = elapsed - HOLD;
      if (t1 <= GATHER) {
        // Phase 1: converge into a slightly fanned pile at the center.
        const p = easeOut(Math.min(1, t1 / GATHER));
        starts.forEach((s, i) => {
          if (s.c.destroyed) return;
          const jitter = (i - (starts.length - 1) / 2) * 0.06;
          s.c.position.set(s.sx + (cx - s.sx) * p, s.sy + (cy - s.sy) * p);
          s.c.rotation = s.sr + (jitter - s.sr) * p;
        });
        return;
      }
      // Phase 2: the pile darts toward the winner, shrinking and fading.
      const p = Math.min(1, (t1 - GATHER) / DART);
      const e = easeIn(p);
      for (const s of starts) {
        if (s.c.destroyed) continue;
        s.c.position.set(cx + (target.x - cx) * e, cy + (target.y - cy) * e);
        s.c.scale.set(1 - 0.45 * p);
        s.c.alpha = 1 - Math.max(0, (p - 0.35)) / 0.65;
      }
      if (p >= 1) {
        Ticker.shared.remove(tick);
        for (const s of starts) if (!s.c.destroyed) s.c.destroy();
        this.shown.clear();
        this.collectKey = '';
        this.animating = false;
      }
    };
    Ticker.shared.add(tick);
  }
}
