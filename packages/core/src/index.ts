// ============================================================================
//  belote-core — POINT D'ENTRÉE PUBLIC (contrat stable depuis v6.0.0).
//  Surface figée : voir PUBLIC_CONTRACT.md. Tout retrait/changement de signature
//  d'un symbole exporté ici ⇒ version MAJEURE (SemVer).
// ============================================================================
export * from './domain/cards';
export * from './domain/types';
export * from './rules/RulesEngine';
export * from './rules/ContreeRules';
export * from './scoring';
export * from './robot/logger';
export * from './robot/conventions/BiddingConvention';
export * from './robot/conventions/StandardContree';
export * from './robot/RobotBrain';
export * from './engine/types';
export * from './engine/GameEngine';
export * from './engine/RobotDriver';
export * from './robot/AlgoSpec';
export * from './robot/Agent';
export * from './robot/algorithm/RobotAlgorithm';
export * from './robot/algorithm/SpecAlgorithm';
export * from './robot/algorithm/registry';
export * from './rules/RulesConfig';
export * from './robot/workflow/steps';
export * from './robot/workflow/WorkflowAlgorithm';
