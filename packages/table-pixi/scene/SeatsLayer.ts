import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Bid, EngineView, Seat, Suit } from 'belote-core';
import { SUIT_SYMBOL, isRedSuit } from './cardAtlas';
import { makeChipTexture, makeTeamLogoTexture } from './tokenTexture';
import type { PixiTableTheme } from '../theme';
import { type Dir, type Rect } from './geometry';
import type { FanMetrics } from './HandsLayer';

const T = (s: string, size: number, fill: number, weight: '500' | '700' | '800' = '700') =>
  new Text({ text: s, style: new TextStyle({ fill, fontSize: size, fontFamily: '"Manrope", ui-sans-serif, sans-serif', fontWeight: weight }) });

export interface SeatDemande { value: number | null; capot: boolean; suitSymbol: string | null; isRed: boolean; reflexion: boolean }
export interface SeatModel {
  seat: Seat; name: string; team: 'blue' | 'yellow';
  isDonneur: boolean; isEntame: boolean; isMeneur: boolean;
  demande: SeatDemande | null; contre: 'none' | 'contree' | 'surcontree';
}

/**
 * SeatsLayer — design-system PlayerStation:
 * pill (gradient #2a3742→#131c24, radius full, logo 32 + name Manrope 700 13),
 * D/E chips 20px pinned at the pill's top-right corner, contract badge BELOW the
 * pill (accent pill, dark text), meneur = standalone green M chip near the seat.
 * Positions: 14px inside the felt (N/S centered, W/E middle, vertical text).
 */
export class SeatsLayer extends Container {
  private nodes: Container[] = [];
  private meneurChip: Sprite;
  private texD: Texture; private texE: Texture; private texM: Texture;
  private logoTex = new Map<string, Texture>();

  constructor(private theme: PixiTableTheme) {
    super();
    this.texD = makeChipTexture('dealer');
    this.texE = makeChipTexture('entame');
    this.texM = makeChipTexture('meneur');
    this.meneurChip = new Sprite(this.texM);
    this.meneurChip.anchor.set(0.5);
    this.meneurChip.width = this.meneurChip.height = 30;
    for (let i = 0; i < 4; i++) { const c = new Container(); this.nodes.push(c); this.addChild(c); }
    this.addChild(this.meneurChip);
  }

  setTheme(t: PixiTableTheme) { this.theme = t; }

  private logo(team: 'blue' | 'yellow', initial: string): Texture {
    const k = `${team}:${initial}`;
    if (!this.logoTex.has(k)) this.logoTex.set(k, makeTeamLogoTexture(team, initial));
    return this.logoTex.get(k)!;
  }

  update(models: SeatModel[], mySeat: Seat, rect: Rect, fans?: Map<Dir, FanMetrics>) {
    // Drop world-positioned chips from the previous update (keep the 4 seat nodes + meneur chip).
    for (const child of [...this.children]) {
      if (child !== this.meneurChip && !this.nodes.includes(child as Container)) child.destroy();
    }
    const t = this.theme;
    const dirs = ['south', 'west', 'north', 'east'] as const;
    let meneurPlaced = false;

    for (let rel = 0; rel < 4; rel++) {
      const seat = ((mySeat + rel) % 4) as Seat;
      const m = models.find((x) => x.seat === seat)!;
      const dir = dirs[rel];
      const node = this.nodes[rel];
      node.removeChildren(); node.rotation = 0;
      const isHoriz = dir === 'south' || dir === 'north';

      // --- Pill (compact : logo + nom réduits pour prendre moins de place) ---
      const nameTxt = T(m.name.slice(0, 8), 11, t.text, '700');
      const logoSize = 24;
      const gap = 6, padL = 4, padR = 10, padY = 3;
      const pillW = padL + logoSize + gap + nameTxt.width + padR;
      const pillH = logoSize + padY * 2; // 40 = --station-h

      const pill = new Graphics();
      // gradient #2a3742 → #131c24 approximated: base + top-half lighter band, clipped by same shape
      pill.roundRect(0, 0, pillW, pillH, pillH / 2).fill(0x131c24);
      pill.roundRect(0, 0, pillW, pillH / 2, pillH / 2).fill({ color: 0x2a3742, alpha: 0.9 });
      pill.roundRect(0, 0, pillW, pillH, pillH / 2).stroke({ width: 1, color: 0xffffff, alpha: 0.08 });
      if (m.isMeneur) {
        // active: ring accent-2 + soft glow
        pill.roundRect(-2, -2, pillW + 4, pillH + 4, (pillH + 4) / 2).stroke({ width: 2, color: t.accent2 });
        pill.roundRect(-5, -5, pillW + 10, pillH + 10, (pillH + 10) / 2).stroke({ width: 5, color: t.accent2, alpha: 0.22 });
      }
      node.addChild(pill);

      const logoSp = new Sprite(this.logo(m.team, m.name.charAt(0).toUpperCase()));
      logoSp.width = logoSp.height = logoSize;
      logoSp.position.set(padL, padY);
      node.addChild(logoSp);
      nameTxt.position.set(padL + logoSize + gap, (pillH - nameTxt.height) / 2);
      node.addChild(nameTxt);

      // --- D/E chips ABOVE the player's hand (fan metrics), fall back to the pill corner ---
      const chips: Texture[] = [];
      if (m.isDonneur) chips.push(this.texD);
      if (m.isEntame) chips.push(this.texE);
      const fan = fans?.get(dir);
      if (fan && chips.length) {
        // Local point above the middle of the fan (14px over the card tops), rotated to world.
        const cos = Math.cos(fan.rot), sin = Math.sin(fan.rot);
        const lx = 0, ly = -fan.cardH - 16; // relative to the fan pivot (totalW/2, cardH)
        const wx = fan.ax + lx * cos - ly * sin;
        const wy = fan.ay + lx * sin + ly * cos;
        chips.forEach((tex, i) => {
          const sp = new Sprite(tex); sp.width = sp.height = 22; sp.anchor.set(0.5);
          sp.position.set(wx + (i - (chips.length - 1) / 2) * 26, wy);
          this.addChild(sp); // world-positioned, outside the pill node
        });
      } else {
        chips.forEach((tex, i) => {
          const sp = new Sprite(tex); sp.width = sp.height = 20;
          sp.position.set(pillW - 16 - i * 22, -4);
          node.addChild(sp);
        });
      }

      // --- Place the whole station, 14px inside the felt ---
      const M = 14;
      node.pivot.set(pillW / 2, pillH / 2);
      if (dir === 'south') node.position.set(rect.x + rect.w / 2, rect.y + rect.h - M - pillH / 2);
      else if (dir === 'north') node.position.set(rect.x + rect.w / 2, rect.y + M + pillH / 2);
      else if (dir === 'west') { node.rotation = Math.PI / 2; node.position.set(rect.x + M + pillH / 2, rect.y + rect.h / 2); }
      else { node.rotation = -Math.PI / 2; node.position.set(rect.x + rect.w - M - pillH / 2, rect.y + rect.h / 2); }

      // --- Meneur chip near the active player (design-system .meneur-slot) ---
      if (m.isMeneur) {
        meneurPlaced = true;
        const off = 90;
        if (dir === 'south') this.meneurChip.position.set(rect.x + rect.w / 2 - 220, rect.y + rect.h - off);
        else if (dir === 'north') this.meneurChip.position.set(rect.x + rect.w / 2 + 220, rect.y + off);
        else if (dir === 'west') this.meneurChip.position.set(rect.x + off, rect.y + rect.h / 2 - 100);
        else this.meneurChip.position.set(rect.x + rect.w - off, rect.y + rect.h / 2 + 60);
      }
    }
    this.meneurChip.visible = meneurPlaced;
  }
}

export function buildSeatModels(view: EngineView, names: string[], showDemandeInPlay: boolean, showReflexion = true): SeatModel[] {
  const lastSeatOf = (action: Bid['action']): Seat | null => {
    for (let i = view.bids.length - 1; i >= 0; i--) if (view.bids[i].action === action) return view.bids[i].seat;
    return null;
  };
  const contreSeat = lastSeatOf('contree');
  const surcontreSeat = lastSeatOf('surcontree');
  const lastBidOf = (seat: Seat): Bid | null => {
    for (let i = view.bids.length - 1; i >= 0; i--) {
      const b = view.bids[i];
      if (b.seat === seat && (b.action === 'bid' || b.action === 'capot')) return b;
    }
    return null;
  };
  return ([0, 1, 2, 3] as Seat[]).map((seat) => {
    const lb = lastBidOf(seat);
    const atout = view.trump ? { sym: SUIT_SYMBOL[view.trump], red: isRedSuit(view.trump) } : null;
    let demande: SeatDemande | null = null;
    if (view.phase === 'bidding' && lb) {
      const g = lb.suit ? { sym: SUIT_SYMBOL[lb.suit], red: isRedSuit(lb.suit) } : null;
      demande = { value: lb.action === 'capot' ? null : (lb.value ?? null), capot: lb.action === 'capot', suitSymbol: lb.saidSuit && g ? g.sym : null, isRed: !!g?.red, reflexion: showReflexion && !!lb.reflexion };
    } else if (view.phase === 'playing' && seat === view.bidderSeat && showDemandeInPlay) {
      demande = { value: lb?.action === 'capot' ? null : (view.currentBidValue ?? null), capot: lb?.action === 'capot', suitSymbol: atout?.sym ?? null, isRed: !!atout?.red, reflexion: showReflexion && !!lb?.reflexion };
    }
    return {
      seat, name: names[seat] ?? `Siège ${seat + 1}`,
      team: seat % 2 === 0 ? 'yellow' : 'blue',   // DS: south/east team vs north/west — pairs 0&2 / 1&3
      isDonneur: seat === view.dealer, isEntame: seat === view.firstBidderSeat,
      isMeneur: seat === view.turn && !view.awaitingCollect,
      demande, contre: seat === surcontreSeat ? 'surcontree' : seat === contreSeat ? 'contree' : 'none',
    };
  });
}
