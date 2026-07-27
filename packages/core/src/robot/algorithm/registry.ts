// ============================================================================
//  Registre des algorithmes — permet d'enregistrer des algos « nommés » custom
//  (codés en dur) tout en gardant SpecAlgorithm comme implémentation par défaut
//  pour toute AlgoSpec. Extensible sans toucher au reste du cœur.
// ============================================================================

import type { AlgoSpec } from '../AlgoSpec';
import type { RobotBrain } from '../RobotBrain';
import type { RobotAlgorithm } from './RobotAlgorithm';
import { SpecAlgorithm } from './SpecAlgorithm';
import { WorkflowAlgorithm } from '../workflow/WorkflowAlgorithm';

export type AlgorithmFactory = (spec: AlgoSpec, brain: RobotBrain, responseTimeMs: number, maxPlayTimeMs: number) => RobotAlgorithm;

const registry = new Map<string, AlgorithmFactory>();

/** Enregistre un algorithme nommé (résolu par AlgoSpec.name). */
export function registerAlgorithm(name: string, factory: AlgorithmFactory): void {
  registry.set(name, factory);
}

/** Résout l'algorithme d'une spec : custom enregistré > workflow JSON > SpecAlgorithm. */
export function resolveAlgorithm(spec: AlgoSpec, brain: RobotBrain, responseTimeMs: number, maxPlayTimeMs: number): RobotAlgorithm {
  const factory = registry.get(spec.name);
  if (factory) return factory(spec, brain, responseTimeMs, maxPlayTimeMs);
  if (spec.workflow) return new WorkflowAlgorithm(brain, spec, spec.workflow, responseTimeMs, maxPlayTimeMs);
  return new SpecAlgorithm(brain, spec, responseTimeMs, maxPlayTimeMs);
}

export function listRegisteredAlgorithms(): string[] {
  return [...registry.keys()];
}
