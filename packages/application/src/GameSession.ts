// ============================================================================
//  GameSession — orchestration PROPRE et réutilisable d'une partie.
//  S'utilise À L'IDENTIQUE par le web (React) et le mobile (HTML/TS) : pas de
//  timer, pas d'I/O. Le front décide QUAND appeler step()/submit*. Le métier
//  (moteur + algorithmes) reste pur.
// ============================================================================

import {
  type Bid, type Card, type EngineView, type GameEngine, type RobotAlgorithm,
  type ReplayRecord, type ScoreSummary, type Seat, robotAct,
} from 'belote-core';

export type StepResult =
  | { kind: 'bid' | 'play'; seat: Seat; thinkMs: number }
  | { kind: 'collect' | 'next' }
  | { kind: 'idle'; seat: Seat } // tour d'un humain : on attend submitBid/submitCard
  | { kind: 'end' };

export class GameSession {
  constructor(
    private readonly engine: GameEngine,
    /** Un algorithme par siège, ou null si humain. */
    private readonly algos: (RobotAlgorithm | null)[],
  ) {}

  view(): EngineView { return this.engine.view(); }
  handOf(seat: Seat): Card[] { return this.engine.handOf(seat); }
  legalCards(seat: Seat): Card[] { return this.engine.legalCards(seat); }
  isOver(): boolean { return this.engine.phase === 'partie_end'; }
  winner(): 'A' | 'B' | undefined { return this.engine.partieWinner; }
  replay(): ReplayRecord { return this.engine.toReplay(); }
  summary(): ScoreSummary { return this.engine.summary(); }

  /** Le siège courant est-il piloté par un humain ? */
  isHumanTurn(): boolean {
    const e = this.engine;
    if (e.phase !== 'bidding' && e.phase !== 'playing') return false;
    if (e.view().awaitingCollect) return false;
    return e.turn != null && this.algos[e.turn] == null;
  }

  /** Avance d'UNE étape automatique. Retourne ce qui s'est passé (et le délai conseillé). */
  step(): StepResult {
    const e = this.engine;
    if (e.phase === 'partie_end') return { kind: 'end' };
    if (e.phase === 'donne_end') { e.nextDonne(); return { kind: 'next' }; }
    if (e.phase === 'manche_end') { e.nextManche(); return { kind: 'next' }; }
    if (e.view().awaitingCollect) { e.collectTrick(); return { kind: 'collect' }; }
    const seat = e.turn!;
    const algo = this.algos[seat];
    if (!algo) return { kind: 'idle', seat };
    const act = robotAct(e, seat, algo);
    if (act.kind === 'bid') {
      const r = e.submitBid(seat, act.bid);
      if (!r.ok) e.submitBid(seat, { action: 'pass' });
      return { kind: 'bid', seat, thinkMs: act.thinkMs };
    }
    e.playCard(seat, act.card);
    return { kind: 'play', seat, thinkMs: act.thinkMs };
  }

  submitBid(seat: Seat, bid: Omit<Bid, 'seat'>) { return this.engine.submitBid(seat, bid); }
  submitCard(seat: Seat, card: Card) { return this.engine.playCard(seat, card); }
}
