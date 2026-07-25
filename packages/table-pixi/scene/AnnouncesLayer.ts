import { Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js';
import type { EngineView, Seat } from 'belote-core';
import { buildAnnounceBubbles, type AnnounceBubble } from './announceBubbles';
import type { FanMetrics } from './HandsLayer';
import type { PixiTableTheme } from '../theme';
import { type Dir, type Rect } from './geometry';

const DIRS: Dir[] = ['south', 'west', 'north', 'east'];
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

const TXT = (s: string, size: number, fill: number, weight: '600' | '700' | '800' = '700') =>
  new Text({ text: s, style: new TextStyle({ fill, fontSize: size, fontFamily: '"Manrope", ui-sans-serif, sans-serif', fontWeight: weight }) });

/** A transient bubble (belote/rebelote call or an emote) shown for a few seconds. */
export interface TransientBubble { seat: Seat; text: string; until: number; kind: 'belote' | 'emote' }

/**
 * AnnouncesLayer — one bubble per seat, positioned at the RIGHT END of the
 * player's fan (level with the top of its last card), animated FROM the player's
 * station pill toward that spot. During bidding every seat shows its last action
 * (Passe included); afterwards only the contract / COINCHÉ / SURCOINCHÉ remain.
 * Transient bubbles (Belote!/Rebelote!, emotes) temporarily replace the seat's
 * persistent bubble.
 */
export class AnnouncesLayer extends Container {
  private keys = new Map<Seat, string>();
  private nodes = new Map<Seat, Container>();
  private transients: TransientBubble[] = [];
  private lastBelotePlayed = -1;
  private redrawTimer: any = null;
  private lastArgs: { view: EngineView; mySeat: Seat; rect: Rect; fans: Map<Dir, FanMetrics>; showReflexion: boolean } | null = null;

  constructor(private theme: PixiTableTheme) { super(); }
  setTheme(t: PixiTableTheme) { this.theme = t; }

  /** Adds a transient emote bubble on a seat (from the smiley bar). */
  emote(seat: Seat, emoji: string) {
    this.transients.push({ seat, text: emoji, until: performance.now() + 3000, kind: 'emote' });
    this.scheduleRedraw();
    if (this.lastArgs) this.update(this.lastArgs.view, this.lastArgs.mySeat, this.lastArgs.rect, this.lastArgs.fans, this.lastArgs.showReflexion);
  }

  update(view: EngineView, mySeat: Seat, rect: Rect, fans: Map<Dir, FanMetrics>, showReflexion: boolean) {
    this.lastArgs = { view, mySeat, rect, fans, showReflexion };

    // Belote / Rebelote transitions (holder announced them only).
    const b = view.belote;
    if (b && b.announcing && b.playedCount !== this.lastBelotePlayed) {
      if (this.lastBelotePlayed >= 0) {
        if (b.playedCount === 1) this.transients.push({ seat: b.seat, text: 'Belote !', until: performance.now() + 2500, kind: 'belote' });
        if (b.playedCount === 2) this.transients.push({ seat: b.seat, text: 'Rebelote !', until: performance.now() + 2500, kind: 'belote' });
      }
      this.lastBelotePlayed = b.playedCount;
      this.scheduleRedraw();
    }
    if (!b) this.lastBelotePlayed = -1;

    const now = performance.now();
    this.transients = this.transients.filter((t) => t.until > now);

    // Build target bubbles: transients override the persistent one on their seat.
    const persistent = buildAnnounceBubbles(view, showReflexion);
    const wanted = new Map<Seat, { key: string; render: () => Container }>();
    for (const bub of persistent) {
      wanted.set(bub.seat, { key: this.keyOf(bub), render: () => this.renderBubble(bub) });
    }
    for (const t of this.transients) {
      wanted.set(t.seat, { key: `${t.kind}:${t.text}:${Math.round(t.until)}`, render: () => this.renderTransient(t) });
    }

    // Diff per seat.
    for (const seat of [0, 1, 2, 3] as Seat[]) {
      const want = wanted.get(seat);
      const key = want?.key ?? '';
      if (this.keys.get(seat) === key) {
        // Reposition only (resize / hand size changed).
        const node = this.nodes.get(seat);
        if (node) { const p = this.targetOf(seat, mySeat, rect, fans); node.position.set(p.x, p.y); }
        continue;
      }
      this.nodes.get(seat)?.destroy();
      this.nodes.delete(seat);
      this.keys.set(seat, key);
      if (!want) continue;
      const node = want.render();
      const to = this.targetOf(seat, mySeat, rect, fans);
      const from = this.stationOf(seat, mySeat, rect);
      node.position.set(from.x, from.y);
      node.alpha = 0;
      this.addChild(node);
      this.nodes.set(seat, node);
      this.animate(node, from, to);
    }
  }

  private keyOf(b: AnnounceBubble): string {
    return `${b.kind}:${b.text}:${b.suitSymbol ?? ''}:${b.reflexion ? 'r' : ''}`;
  }

  /** Bubble target: right end of the fan, level with the top of the last card. */
  private targetOf(seat: Seat, mySeat: Seat, rect: Rect, fans: Map<Dir, FanMetrics>): { x: number; y: number } {
    const rel = ((seat - mySeat + 4) % 4);
    const dir = DIRS[rel];
    const fan = fans.get(dir);
    if (!fan) return this.stationOf(seat, mySeat, rect);
    // Local point relative to the fan pivot (totalW/2, cardH): beyond the right
    // edge of the last card, at the cards' top level.
    const lx = fan.totalW / 2 + 16, ly = -fan.cardH;
    const cos = Math.cos(fan.rot), sin = Math.sin(fan.rot);
    return { x: fan.ax + lx * cos - ly * sin, y: fan.ay + lx * sin + ly * cos };
  }

  /** Where the animation starts: the player's station pill (14px inside the felt). */
  private stationOf(seat: Seat, mySeat: Seat, rect: Rect): { x: number; y: number } {
    const rel = ((seat - mySeat + 4) % 4);
    const M = 14 + 20;
    switch (DIRS[rel]) {
      case 'south': return { x: rect.x + rect.w / 2, y: rect.y + rect.h - M };
      case 'north': return { x: rect.x + rect.w / 2, y: rect.y + M };
      case 'west':  return { x: rect.x + M, y: rect.y + rect.h / 2 };
      case 'east':  return { x: rect.x + rect.w - M, y: rect.y + rect.h / 2 };
    }
  }

  private animate(node: Container, from: { x: number; y: number }, to: { x: number; y: number }) {
    let elapsed = 0;
    const DUR = 300;
    const tick = (t: Ticker) => {
      if (node.destroyed) { Ticker.shared.remove(tick); return; }
      elapsed += t.deltaMS;
      const p = Math.min(1, elapsed / DUR);
      const e = easeOut(p);
      node.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      node.alpha = p;
      if (p >= 1) Ticker.shared.remove(tick);
    };
    Ticker.shared.add(tick);
  }

  /** Pill: dark rounded bubble; COINCHÉ red, SURCOINCHÉ dark-red with gold ring. */
  private renderBubble(b: AnnounceBubble): Container {
    const node = new Container();
    const parts: Text[] = [];
    const strong = b.kind === 'coinche' || b.kind === 'surcoinche';
    parts.push(TXT(b.text, 13, strong ? 0xffffff : this.theme.text, '800'));
    if (b.suitSymbol) parts.push(TXT(b.suitSymbol, 14, b.suitIsRed ? 0xff6b78 : 0xffffff, '800'));
    if (b.reflexion) parts.push(TXT('💭', 12, 0xffffff, '700'));
    const gap = 5, padX = 10, h = 26;
    const inner = parts.reduce((a, p) => a + p.width, 0) + gap * (parts.length - 1);
    const w = inner + padX * 2;
    const bg = new Graphics();
    const fill = b.kind === 'coinche' ? 0xc8272a : b.kind === 'surcoinche' ? 0x7a1116 : 0x0b1116;
    bg.roundRect(-w / 2, -h / 2, w, h, h / 2).fill({ color: fill, alpha: b.kind === 'pass' ? 0.72 : 0.92 });
    bg.roundRect(-w / 2, -h / 2, w, h, h / 2).stroke({ width: 1, color: b.kind === 'surcoinche' ? 0xd4a24a : 0xffffff, alpha: b.kind === 'surcoinche' ? 1 : 0.14 });
    node.addChild(bg);
    let x = -inner / 2;
    for (const p of parts) { p.position.set(x, -p.height / 2); node.addChild(p); x += p.width + gap; }
    if (b.kind === 'pass') node.alpha = 0.85;
    return node;
  }

  /** Transient: Belote!/Rebelote! (gold) or an emote (large emoji, no pill). */
  private renderTransient(t: TransientBubble): Container {
    const node = new Container();
    if (t.kind === 'emote') {
      const e = TXT(t.text, 30, 0xffffff, '700');
      e.anchor.set(0.5);
      node.addChild(e);
      return node;
    }
    const txt = TXT(t.text, 14, 0x1a0f00, '800');
    const padX = 12, h = 28, w = txt.width + padX * 2;
    const bg = new Graphics();
    bg.roundRect(-w / 2, -h / 2, w, h, h / 2).fill(this.theme.accent2);
    bg.roundRect(-w / 2, -h / 2, w, h, h / 2).stroke({ width: 1.5, color: 0xffffff, alpha: 0.85 });
    node.addChild(bg);
    txt.position.set(-txt.width / 2, -txt.height / 2);
    node.addChild(txt);
    return node;
  }

  /** Re-render shortly after the soonest transient expiry (works while paused). */
  private scheduleRedraw() {
    if (this.redrawTimer) clearTimeout(this.redrawTimer);
    const next = Math.min(...this.transients.map((t) => t.until), Infinity);
    if (!isFinite(next)) return;
    this.redrawTimer = setTimeout(() => {
      this.redrawTimer = null;
      if (this.lastArgs && !this.destroyed) {
        this.update(this.lastArgs.view, this.lastArgs.mySeat, this.lastArgs.rect, this.lastArgs.fans, this.lastArgs.showReflexion);
      }
    }, Math.max(50, next - performance.now() + 30));
  }

  destroy(options?: Parameters<Container['destroy']>[0]) {
    if (this.redrawTimer) clearTimeout(this.redrawTimer);
    super.destroy(options);
  }
}
