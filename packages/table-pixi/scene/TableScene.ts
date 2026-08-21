import { Container } from 'pixi.js';
import type { Card, EngineView, Seat } from 'belote-core';
import type { PixiTableTheme } from '../theme';
import { FeltLayer } from './FeltLayer';
import { SeatsLayer, buildSeatModels } from './SeatsLayer';
import { HandsLayer } from './HandsLayer';
import { TrickLayer } from './TrickLayer';
import { AnnouncesLayer } from './AnnouncesLayer';
import { CardAtlas } from './cardAtlas';
import type { Rect } from './geometry';

export interface SceneCallbacks { onPlay?: (card: Card) => void }
export interface SceneState {
  view: EngineView; names: string[]; hands: (Card[] | null)[];
  legal: Card[]; mySeat: Seat; showDemandeInPlay: boolean; showReflexion?: boolean;
  /** In play mode the PARTNER's hand is always face-down (you never see your partner's cards). */
  partnerFaceDown?: boolean;
  vipSeats?: boolean[];
}

/**
 * TableScene — the whole table in ONE Pixi component. Owns the card atlas
 * (single set — DS cards are theme-invariant; only glows/felt change per theme).
 * The felt fills the view: stage margin 12px + responsive rail padding.
 */
export class TableScene extends Container {
  private felt: FeltLayer;
  private seats: SeatsLayer;
  private hands: HandsLayer;
  private trick: TrickLayer;
  private announces: AnnouncesLayer;
  private atlas: CardAtlas;
  private w = 0; private h = 0;
  private _rect: Rect = { x: 0, y: 0, w: 0, h: 0, r: 0 };

  constructor(private cb: SceneCallbacks, private theme: PixiTableTheme) {
    super();
    this.felt = new FeltLayer(theme);
    this.seats = new SeatsLayer(theme);
    this.hands = new HandsLayer(theme);
    this.trick = new TrickLayer(theme);
    this.announces = new AnnouncesLayer(theme);
    this.atlas = new CardAtlas(
      Math.min(3, Math.ceil((window.devicePixelRatio || 1) * 1.5)),
      { backHi: theme.backHi, backLo: theme.backLo, backStripe: theme.backStripe, backBorder: theme.backBorder },
    );
    this.addChild(this.felt, this.trick, this.hands, this.seats, this.announces);
  }

  setTheme(theme: PixiTableTheme) {
    this.theme = theme;
    this.felt.setTheme(theme);
    this.seats.setTheme(theme);
    this.hands.setTheme(theme);
    this.trick.setTheme(theme);
    this.announces.setTheme(theme);
    // v18 — le dos des cartes suit le thème (reconstruit si couleurs changées).
    this.atlas.setBack({ backHi: theme.backHi, backLo: theme.backLo, backStripe: theme.backStripe, backBorder: theme.backBorder });
  }

  /** Show a transient emote bubble on a seat (smiley bar). */
  emote(seat: Seat, emoji: string) { this.announces.emote(seat, emoji); }

  /** Felt rect: stage margin 12 + responsive rail pad (DS TableFelt). */
  private buildRect(): Rect {
    const stage = 12;
    const pad = FeltLayer.railPad(this.w);
    const x = stage + pad, y = stage + pad;
    return { x, y, w: Math.max(0, this.w - x * 2), h: Math.max(0, this.h - y * 2), r: 22 };
  }

  rect(): Rect { return this._rect; }

  layout(width: number, height: number) {
    this.w = width; this.h = height;
    this._rect = this.buildRect();
    this.felt.layout(this._rect, this.w);
  }

  update(s: SceneState) {
    this._rect = this.buildRect();
    // Card width: CONTINUOUS responsive scale — proportional to the felt so the
    // table adapts instantly to ANY viewport (phone landscape ≈ 300px tall up
    // to desktop). Bounds keep the atlas crisp (min 40) and tasteful (max 84).
    const cardW = responsiveCardW(this._rect.w, this._rect.h);

    this.felt.layout(this._rect, this.w);
    this.felt.update(s.view.trump, this._rect);
    this.hands.update(s.hands, s.legal, s.view, s.mySeat, this._rect, this.atlas, cardW, (c) => this.cb.onPlay?.(c), s.partnerFaceDown ?? false);
    this.seats.update(buildSeatModels(s.view, s.names, s.showDemandeInPlay, s.showReflexion ?? true, s.vipSeats), s.mySeat, this._rect, this.hands.metrics);
    this.trick.update(s.view, s.mySeat, this._rect, this.atlas, cardW);
    this.announces.update(s.view, s.mySeat, this._rect, this.hands.metrics, s.showReflexion ?? true);
  }

  destroy(options?: Parameters<Container['destroy']>[0]) {
    this.atlas.destroy();
    super.destroy(options);
  }
}


/**
 * Largeur de carte responsive (pure, testée) : proportionnelle au feutre.
 * ~1/11e de la largeur et ~1/5.6e de la hauteur, bornée [40, 84].
 */
export function responsiveCardW(feltW: number, feltH: number): number {
  const byWidth = feltW / 11;
  const byHeight = feltH / 5.6;
  return Math.max(40, Math.min(84, Math.floor(Math.min(byWidth, byHeight))));
}
