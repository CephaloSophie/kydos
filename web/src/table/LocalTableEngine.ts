import {
  ContreeRules, createAlgorithm, DEFAULT_PARTIE, GameEngine, makeRobot, robotAct, shouldSurcontrer,
  type Bid, type Card, type EnginePlayer, type LogEntry, type RobotAlgorithm, type RobotConfig, type Seat,
} from 'belote-core';
import type { TableContext } from './TableConfig.model';

const contreeRules = new ContreeRules();
const BID_RESPONSE_MS = 700;
const MANCHE_BREAK_MS = 5200;
const DONNE_BREAK_MS = 1200;
const MIN_PLAY_DELAY_MS = 60;

interface ScheduledStep {
  run: () => void;
  delayMs: number;
  ignoreSpeed?: boolean;
}

/**
 * Pilote LOCAL d'une table (entraînement, démo, IA vs IA).
 * Instancie un moteur depuis un TableContext et fait avancer le jeu, en laissant
 * la main aux humains. Aucune dépendance réseau : réutilisable partout.
 */
export class LocalTableEngine {
  readonly engine: GameEngine;
  private readonly brains: (RobotAlgorithm | null)[];
  private readonly robots: (RobotConfig | null)[];
  private readonly humanSeats: Set<number>;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private speed: number;

  constructor(context: TableContext, onLog: (entry: LogEntry) => void) {
    this.speed = context.config.speed;
    const enginePlayers: EnginePlayer[] = context.participants.map((participant) => ({
      seat: participant.seatIndex as Seat,
      name: participant.name,
      type: participant.type,
      robotId: participant.robotConfig?.id,
    }));
    this.engine = new GameEngine(
      enginePlayers,
      { ...DEFAULT_PARTIE, manches: context.config.manches, clockwise: context.config.clockwise, local: true, signals: context.config.signals },
      contreeRules,
    );
    this.humanSeats = new Set(context.participants.filter((p) => p.type === 'human').map((p) => p.seatIndex));
    this.robots = context.participants.map((participant) =>
      participant.type === 'robot'
        ? makeRobot({
            id: participant.robotConfig?.id ?? `robot-${participant.seatIndex}`,
            name: participant.name,
            personality: participant.robotConfig?.personality,
            responseTimeMs: participant.robotConfig?.responseTimeMs,
            maxPlayTimeMs: participant.robotConfig?.maxPlayTimeMs,
            algoSpec: participant.robotConfig?.algoSpec as any,
          })
        : null,
    );
    this.brains = this.robots.map((robot) => (robot ? createAlgorithm(robot, contreeRules, onLog) : null));
  }

  setSpeed(speed: number) { this.speed = speed; }
  isHumanSeat(seatIndex: number): boolean { return this.humanSeats.has(seatIndex); }

  /** Action humaine : enchère. */
  submitHumanBid(seatIndex: Seat, bid: Omit<Bid, 'seat'>): boolean {
    return this.engine.submitBid(seatIndex, bid).ok;
  }

  /** Action humaine : jouer une carte. */
  playHumanCard(seatIndex: Seat, card: Card): boolean {
    return this.engine.playCard(seatIndex, card).ok;
  }

  /** Détermine la prochaine étape automatique (null = on attend un humain). */
  planNextStep(): ScheduledStep | null {
    const engine = this.engine;
    if (engine.phase === 'partie_end') return null;
    if (engine.phase === 'donne_end') return { run: () => engine.nextDonne(), delayMs: DONNE_BREAK_MS };
    if (engine.phase === 'manche_end') return { run: () => engine.nextManche(), delayMs: MANCHE_BREAK_MS, ignoreSpeed: true };
    if (engine.view().awaitingCollect) return { run: () => engine.collectTrick(), delayMs: 1500 };

    // Micro-phase surcontre : les robots du camp preneur décident (hook), les humains attendent la popup.
    if (engine.phase === 'surcontre') {
      const pending = engine.view().surcontreSeats as Seat[];
      const robotSeat = pending.find((s) => this.brains[s]);
      if (robotSeat == null) return null; // tous humains -> on laisse la popup décider
      const decide = shouldSurcontrer(this.robots[robotSeat]!, engine.view(), robotSeat);
      return {
        run: () => engine.submitBid(robotSeat, { action: decide ? 'surcontree' : 'pass' }),
        delayMs: BID_RESPONSE_MS, ignoreSpeed: true,
      };
    }

    const currentSeat = engine.turn!;
    const brain = this.brains[currentSeat];
    if (!brain) return null; // tour d'un humain

    const action = robotAct(engine, currentSeat, brain);
    const run = () => {
      if (action.kind === 'bid') { if (!engine.submitBid(currentSeat, action.bid).ok) engine.submitBid(currentSeat, { action: 'pass' }); }
      else engine.playCard(currentSeat, action.card);
    };
    return { run, delayMs: action.kind === 'bid' ? BID_RESPONSE_MS : action.thinkMs, ignoreSpeed: action.kind === 'bid' };
  }

  /** Programme l'exécution de la prochaine étape ; rappelle onAdvance après. */
  scheduleNextStep(onAdvance: () => void): boolean {
    const step = this.planNextStep();
    if (!step) return false;
    const delay = step.ignoreSpeed ? step.delayMs : Math.max(MIN_PLAY_DELAY_MS, step.delayMs / this.speed);
    this.pendingTimer = setTimeout(() => { this.pendingTimer = null; step.run(); onAdvance(); }, delay);
    return true;
  }

  hasPendingTimer(): boolean { return this.pendingTimer !== null; }
  cancelPendingTimer() { if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; } }
}
