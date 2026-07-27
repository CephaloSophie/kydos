/* =============================================================================
 * SERVICES · gameLoop.ts — Contrôleur de partie LOCALE (pur, testable).
 * -----------------------------------------------------------------------------
 * Encapsule la boucle de jeu contre des robots autour de belote-core :
 * planification du prochain coup (annonce / carte / ramassage / donne / manche),
 * délais réalistes, pause et vitesse. AUCUNE dépendance au DOM ni à React :
 * on lui fournit un `onTick` (re-render) et un `scheduler` (setTimeout injecté,
 * remplaçable en test). Le comportement des robots vient intégralement du moteur.
 * ========================================================================== */
import { GameEngine, robotAct, type RobotAlgorithm, type Seat } from 'belote-core';

export interface LoopStep { run: () => void; ms: number; noSpeed?: boolean }

export type Scheduler = (fn: () => void, ms: number) => () => void; // renvoie un annuleur

/** setTimeout par défaut, enveloppé pour renvoyer un annuleur. */
export const timeoutScheduler: Scheduler = (fn, ms) => { const id = setTimeout(fn, ms); return () => clearTimeout(id); };

export interface GameLoopOptions {
  brains: (RobotAlgorithm | null)[]; // null = siège humain
  onTick: () => void;                // appelé après chaque avancée
  onEnd?: () => void;                // appelé une fois la partie terminée
  scheduler?: Scheduler;
  preDelayMs?: number;               // délai avant qu'un robot pose sa carte
  trickPauseMs?: number;             // pause avant ramassage du pli
  mancheGapMs?: number;              // pause entre manches (chrono popup)
}

export class GameLoop {
  #engine: GameEngine;
  #brains: (RobotAlgorithm | null)[];
  #onTick: () => void;
  #onEnd?: () => void;
  #schedule: Scheduler;
  #cancel: (() => void) | null = null;
  #paused = false;
  #speed = 1;
  #ended = false;
  readonly preDelayMs: number;
  readonly trickPauseMs: number;
  readonly mancheGapMs: number;

  constructor(engine: GameEngine, opts: GameLoopOptions) {
    this.#engine = engine;
    this.#brains = opts.brains;
    this.#onTick = opts.onTick;
    this.#onEnd = opts.onEnd;
    this.#schedule = opts.scheduler ?? timeoutScheduler;
    this.preDelayMs = opts.preDelayMs ?? 400;
    this.trickPauseMs = opts.trickPauseMs ?? 1500;
    this.mancheGapMs = opts.mancheGapMs ?? 5200;
  }

  get engine(): GameEngine { return this.#engine; }
  get paused(): boolean { return this.#paused; }
  get speed(): number { return this.#speed; }

  /**
   * Détermine la prochaine action AUTOMATIQUE et son délai.
   * Renvoie null quand c'est au tour d'un humain (ou partie finie).
   * PUR : ne planifie rien, ne mute rien — utilisable tel quel en test.
   */
  plan(): LoopStep | null {
    const e = this.#engine;
    if (e.phase === 'partie_end') return null;
    if (e.phase === 'donne_end') return { run: () => e.nextDonne(), ms: 1200 };
    if (e.phase === 'manche_end') return { run: () => e.nextManche(), ms: this.mancheGapMs, noSpeed: true };
    if (e.view().awaitingCollect) return { run: () => e.collectTrick(), ms: this.trickPauseMs };
    const seat = e.turn as Seat;
    const brain = this.#brains[seat];
    if (!brain) return null; // tour d'un humain
    const act = robotAct(e, seat, brain);
    const run = () => {
      if (act.kind === 'bid') { const r = e.submitBid(seat, act.bid); if (!r.ok) e.submitBid(seat, { action: 'pass' }); }
      else e.playCard(seat, act.card);
    };
    return { run, ms: act.kind === 'bid' ? 700 : this.preDelayMs + act.thinkMs, noSpeed: act.kind === 'bid' };
  }

  /** Démarre / relance la boucle (idempotent). */
  start(): void { this.#ended = false; this.#tick(); }

  /** Avance d'un pas (pas-à-pas manuel). */
  stepOnce(): void { this.#clear(); this.plan()?.run(); this.#onTick(); }

  setPaused(p: boolean): void { this.#paused = p; if (!p) this.#tick(); else this.#clear(); }
  togglePause(): boolean { this.setPaused(!this.#paused); return this.#paused; }

  /** Cycle 1× → 2× → 4× → 1×. */
  cycleSpeed(): number { this.#speed = this.#speed === 1 ? 2 : this.#speed === 2 ? 4 : 1; return this.#speed; }
  setSpeed(s: number): void { this.#speed = s; }

  /** Appelé par l'UI après un coup humain (annonce / carte) pour relancer. */
  resume(): void { this.#onTick(); this.#tick(); }

  dispose(): void { this.#clear(); }

  #tick(): void {
    if (this.#paused || this.#cancel) return;
    const step = this.plan();
    if (!step) {
      if (this.#engine.phase === 'partie_end' && !this.#ended) { this.#ended = true; this.#onEnd?.(); }
      return;
    }
    const delay = step.noSpeed ? step.ms : Math.max(60, step.ms / this.#speed);
    this.#cancel = this.#schedule(() => { this.#cancel = null; step.run(); this.#onTick(); this.#tick(); }, delay);
  }

  #clear(): void { if (this.#cancel) { this.#cancel(); this.#cancel = null; } }
}

/** Fabrique un moteur local prêt à l'emploi + la liste des cerveaux. */
export interface LocalGameSetup { engine: GameEngine; brains: (RobotAlgorithm | null)[]; mySeat: Seat | null }
