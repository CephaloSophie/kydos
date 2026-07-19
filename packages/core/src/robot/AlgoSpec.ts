// ============================================================================
//  AlgoSpec — l'algorithme d'un robot sous forme de JSON COMPLET et versionné.
//  Le cœur (front comme back) sait l'interpréter via algoToRuntime().
//  Un robot ne contient pas de code : il pointe vers une AlgoSpec.
//
//  Le contexte fourni au robot (TableContext, déjà défini dans domain/types)
//  expose en lecture : coups légaux, demandeur, atout, nb d'atouts joués/restants,
//  atouts non vus, cartes jouées, pli courant, enchères, contre/surcontre.
// ============================================================================

import type { Personality } from '../domain/types';
import { DEFAULT_CONVENTION, type ConventionConfig } from './conventions/BiddingConvention';
import { StandardContreeConvention } from './conventions/StandardContree';

export interface AlgoSpec {
  /** Version du schéma (pour migrations futures). */
  version: 1;
  /** Identifiant lisible de l'algo ("Classique", "Agressif"…). */
  name: string;
  /** Tempérament : agressivité / concentration / vélocité (0..10). */
  personality: Personality;
  /** Surcharges de la convention d'enchères (sous-ensemble de ConventionConfig). */
  bidding: Partial<ConventionConfig>;
  /** Décisions de contre / surcontre. */
  contre: {
    enabled: boolean;
    /** Seuil de « risque adverse » estimé (0..1) au-delà duquel on contre. */
    minOpponentRiskToContre: number;
    /** Seuil de force propre (0..1) au-delà duquel on surcontre. */
    minOwnStrengthToSurcontre: number;
  };
  /** Réglages de jeu de la carte. */
  play: {
    /** Pondération d'agressivité au jeu (0..10) ; défaut = personality.aggressiveness. */
    aggressiveness?: number;
  };
  /** Si présent, l'algo est un WORKFLOW de fonctions (pipeline) plutôt que SpecAlgorithm. */
  workflow?: import('./workflow/WorkflowAlgorithm').AlgoWorkflow;
}

export const DEFAULT_ALGO: AlgoSpec = {
  version: 1,
  name: 'Classique',
  personality: { aggressiveness: 5, concentration: 5, velocity: 5 },
  bidding: {},
  contre: { enabled: true, minOpponentRiskToContre: 0.65, minOwnStrengthToSurcontre: 0.8 },
  play: {},
};

export const ALGO_CLASSIQUE: AlgoSpec = DEFAULT_ALGO;

export const ALGO_AGRESSIF: AlgoSpec = {
  version: 1,
  name: 'Agressif',
  personality: { aggressiveness: 9, concentration: 6, velocity: 8 },
  bidding: { weakOpenMinTrump: 3, weakOpenKeyMinTrump: 2, acePoints: 15 },
  contre: { enabled: true, minOpponentRiskToContre: 0.5, minOwnStrengthToSurcontre: 0.7 },
  play: { aggressiveness: 9 },
};

/** Fusion défensive d'une spec partielle avec la spec par défaut. */
export function normalizeAlgo(spec?: Partial<AlgoSpec> | null): AlgoSpec {
  if (!spec) return DEFAULT_ALGO;
  return {
    version: 1,
    name: spec.name ?? DEFAULT_ALGO.name,
    personality: { ...DEFAULT_ALGO.personality, ...spec.personality },
    bidding: { ...DEFAULT_ALGO.bidding, ...spec.bidding },
    contre: { ...DEFAULT_ALGO.contre, ...spec.contre },
    play: { ...DEFAULT_ALGO.play, ...spec.play },
    workflow: spec.workflow,
  };
}

/** Runtime exploitable par le cerveau : convention d'enchères + réglages dérivés. */
export interface AlgoRuntime {
  spec: AlgoSpec;
  convention: StandardContreeConvention;
  playAggressiveness: number;
}

export function algoToRuntime(spec?: Partial<AlgoSpec> | null): AlgoRuntime {
  const s = normalizeAlgo(spec);
  const convention = new StandardContreeConvention({ ...DEFAULT_CONVENTION, ...s.bidding });
  return { spec: s, convention, playAggressiveness: s.play.aggressiveness ?? s.personality.aggressiveness };
}
