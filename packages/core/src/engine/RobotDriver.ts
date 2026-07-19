// ============================================================================
//  RobotDriver — pont entre le moteur PUR et l'abstraction RobotAlgorithm.
//  C'est ICI que « l'algo du robot tourne » (front local comme serveur),
//  jamais dans le moteur. Le robot pointe vers une AlgoSpec -> RobotAlgorithm.
// ============================================================================

import type { Card, Suit } from '../domain/cards';
import type { Bid, Seat } from '../domain/types';
import { ContreeRules } from '../rules/ContreeRules';
import { partnerOf, teamOf } from '../rules/RulesEngine';
import { normalizeAlgo, type AlgoSpec } from '../robot/AlgoSpec';
import { RobotBrain } from '../robot/RobotBrain';
import { RobotLogger, type LogSink } from '../robot/logger';
import { DEFAULT_ROBOT, type RobotConfig } from '../domain/types';
import { resolveAlgorithm } from '../robot/algorithm/registry';
import type { RobotAlgorithm, RobotContext } from '../robot/algorithm/RobotAlgorithm';
import { algoToRuntime } from '../robot/AlgoSpec';
import type { GameEngine } from './GameEngine';

/** Construit le cerveau de convention (logique d'enchère/carte) depuis l'AlgoSpec. */
export function createBrain(robot: RobotConfig, rules = new ContreeRules(), sink?: LogSink): RobotBrain {
  const logger = new RobotLogger(robot.id, true, 'trace', sink);
  const runtime = algoToRuntime(robot.algoSpec);
  return new RobotBrain(robot, runtime.convention, rules, logger);
}

/** Résout l'algorithme abstrait d'un robot (SpecAlgorithm par défaut). */
export function createAlgorithm(robot: RobotConfig, rules = new ContreeRules(), sink?: LogSink): RobotAlgorithm {
  const spec = normalizeAlgo(robot.algoSpec);
  const brain = createBrain(robot, rules, sink);
  return resolveAlgorithm(spec, brain, robot.responseTimeMs, robot.maxPlayTimeMs);
}

export function makeRobot(partial: Partial<RobotConfig> & { id: string; name: string }): RobotConfig {
  return { ...DEFAULT_ROBOT, ...partial, personality: { ...DEFAULT_ROBOT.personality, ...partial.personality } };
}

/**
 * Fiche d'un robot telle qu'elle est STOCKÉE (document MongoDB) ou renvoyée par l'API.
 * Forme volontairement permissive (`id` ou `_id`) pour être consommée à l'identique
 * côté serveur et côté client.
 */
export interface RobotFiche {
  id?: string;
  _id?: string;
  name?: string;
  personality?: Partial<RobotConfig['personality']>;
  responseTimeMs?: number;
  maxPlayTimeMs?: number;
  algoSpec?: RobotConfig['algoSpec'] | null;
}

/**
 * FABRIQUE UNIQUE : construit un RobotConfig prêt à jouer à partir de sa fiche stockée.
 * Utilisée par le front (entraînement) ET le back (compétition, parties en ligne) afin
 * que le MÊME robot pense exactement de la même façon partout (même personnalité, même algoSpec).
 */
export function robotFromFiche(fiche: RobotFiche, fallback?: { id?: string; name?: string }): RobotConfig {
  return makeRobot({
    id: String(fiche.id ?? fiche._id ?? fallback?.id ?? 'robot'),
    name: fiche.name ?? fallback?.name ?? 'Robot',
    personality: fiche.personality as RobotConfig['personality'] | undefined,
    responseTimeMs: fiche.responseTimeMs,
    maxPlayTimeMs: fiche.maxPlayTimeMs,
    algoSpec: fiche.algoSpec ?? undefined,
  });
}

/**
 * Décision de SURCOINCHE d'un robot pendant la micro-phase surcontre.
 * Par défaut renvoie `false` (le robot passe). Point d'extension : brancher ici une
 * logique ou lire une règle depuis l'algoSpec du robot (ex. spec.surcontre).
 *
 * @param robot   fiche/config du robot (contient `algoSpec`)
 * @param _view   vue moteur courante (contexte pour décider plus tard)
 * @param _seat   siège du robot concerné
 */
export function shouldSurcontrer(robot: RobotConfig, _view?: unknown, _seat?: number): boolean {
  // Exemple d'extension future :
  //   const spec: any = robot.algoSpec;
  //   if (spec?.surcontre?.always) return true;
  void robot;
  return false;
}

/** Assemble le contexte (lecture seule) vu par l'algorithme à partir du moteur. */
function buildRobotContext(engine: GameEngine, seat: Seat, spec: AlgoSpec): RobotContext {
  const table = engine.contextFor(seat);
  const bidder = table.bidderSeat;
  const myTeam = teamOf(seat);
  const partner = partnerOf(seat);
  const info = engine.legalBidInfo(seat);
  const trumpsPlayed = table.trump ? table.playedCards.filter((p) => p.card.suit === table.trump).length : 0;
  return {
    seat, partnerSeat: partner, myTeam, personality: spec.personality, spec,
    hand: engine.handOf(seat), table,
    isDemandeur: bidder != null && teamOf(bidder) === myTeam,
    partnerIsDemandeur: bidder === partner,
    legalCards: engine.legalCards(seat),
    legalBidInfo: { minValue: info.minValue, maxValue: info.maxValue, canContre: info.canContre, canSurcontre: info.canSurcontre },
    trumpsPlayed, trumpsRemaining: table.trumpsRemaining, trumpsUnseen: table.trumpsUnseen,
  };
}

type ActBid = { kind: 'bid'; bid: { action: Bid['action']; value?: number; suit?: Suit; saidSuit?: boolean }; thinkMs: number };
type ActPlay = { kind: 'play'; card: Card; thinkMs: number };

/** Calcule l'action du robot dont c'est le tour (le contrôleur l'applique). */
export function robotAct(engine: GameEngine, seat: Seat, algo: RobotAlgorithm): ActBid | ActPlay {
  const base = algo.responseTimeMs;
  // Micro-phase surcontre : par défaut le robot passe. La décision configurable de surcoinche
  // est portée par shouldSurcontrer() dans les pilotes (qui disposent de la fiche robot complète).
  if (engine.phase === 'surcontre') {
    return { kind: 'bid', bid: { action: 'pass' }, thinkMs: base };
  }
  if (engine.phase === 'bidding') {
    const ctx = buildRobotContext(engine, seat, algo.spec);
    if (ctx.legalBidInfo.canContre && algo.shouldContre(ctx))
      return { kind: 'bid', bid: { action: 'contree' }, thinkMs: base };
    const d = algo.decideBid(ctx);
    const highest = engine.view().currentBidValue ?? 0;
    const canRaise = d.action === 'bid' && (d.value ?? 0) > highest;
    return {
      kind: 'bid',
      bid: canRaise ? { action: 'bid', value: d.value, suit: d.suit, saidSuit: d.saySuit } : { action: 'pass' },
      thinkMs: Math.min(base * d.thinkMultiplier, algo.maxPlayTimeMs),
    };
  }
  const ctx = buildRobotContext(engine, seat, algo.spec);
  const d = algo.decideCard(ctx);
  return { kind: 'play', card: d.card, thinkMs: Math.min(base * d.thinkMultiplier, algo.maxPlayTimeMs) };
}
