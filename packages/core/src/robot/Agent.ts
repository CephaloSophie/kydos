// ============================================================================
//  Agent — le robot vu comme un INDIVIDU autonome et abstrait.
//
//  Un Agent encapsule un « génome » (AlgoSpec, données pures) + le cerveau résolu
//  (RobotAlgorithm, fonction pure contexte -> décision). Il s'instancie depuis une
//  spec SEULE — sans moteur, sans réseau — et se manipule/teste isolément.
//
//  Le même Agent fonctionne à l'identique en LOCAL (front/entraînement) et en
//  NON-LOCAL (back/compétition/live) : il ne dépend que du RobotContext (lecture
//  seule), jamais d'une implémentation de jeu particulière.
// ============================================================================

import { ContreeRules } from '../rules/ContreeRules';
import type { BidDecision, CardDecision } from '../domain/types';
import { type AlgoSpec, normalizeAlgo, DEFAULT_ALGO } from './AlgoSpec';
import { createAlgorithm } from '../engine/RobotDriver';
import type { RobotAlgorithm, RobotContext } from './algorithm/RobotAlgorithm';
import type { LogSink } from './logger';

export interface AgentInit {
  /** Identifiant stable de l'individu. */
  id?: string;
  /** Nom lisible (sinon repris du génome). */
  name?: string;
  /** Génome : spec complète ou partielle (fusionnée défensivement avec DEFAULT_ALGO). */
  spec?: Partial<AlgoSpec> | null;
  /** Temps de réflexion de base / max (ms). */
  responseTimeMs?: number;
  maxPlayTimeMs?: number;
}

/**
 * Agent — individu de jeu autonome. Expose son génome (`spec`), son cerveau (`brain`)
 * et délègue les 4 décisions. Aucune dépendance au moteur : `decide*` sont des fonctions
 * pures du `RobotContext` qu'on lui présente.
 */
export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly spec: AlgoSpec;
  readonly brain: RobotAlgorithm;
  decideBid(context: RobotContext): BidDecision;
  decideCard(context: RobotContext): CardDecision;
  shouldContre(context: RobotContext): boolean;
  shouldSurcontre(context: RobotContext): boolean;
}

/**
 * Construit un Agent à partir d'un génome (AlgoSpec). Point d'entrée UNIQUE, utilisable
 * partout : `createAgent({ spec: ALGO_AGRESSIF })`. Les règles n'interviennent que pour
 * résoudre le cerveau ; l'individu reste indépendant du moteur de partie.
 */
export function createAgent(init: AgentInit = {}, rules: ContreeRules = new ContreeRules(), sink?: LogSink): Agent {
  const spec = normalizeAlgo(init.spec);
  const robot = {
    id: init.id ?? 'agent',
    name: init.name ?? spec.name ?? DEFAULT_ALGO.name,
    personality: spec.personality,
    responseTimeMs: init.responseTimeMs ?? 600,
    maxPlayTimeMs: init.maxPlayTimeMs ?? 4000,
    algoSpec: spec,
  };
  const brain = createAlgorithm(robot as any, rules, sink);
  return {
    id: robot.id,
    name: robot.name,
    spec,
    brain,
    decideBid: (context) => brain.decideBid(context),
    decideCard: (context) => brain.decideCard(context),
    shouldContre: (context) => brain.shouldContre(context),
    shouldSurcontre: (context) => brain.shouldSurcontre(context),
  };
}
