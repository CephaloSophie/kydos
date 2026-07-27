// ============================================================================
//  WorkflowAlgorithm — un RobotAlgorithm dont CHAQUE décision est un pipeline
//  de fonctions (cf. steps.ts). Le pipeline vient du JSON (AlgoSpec.workflow),
//  donc on crée un nouvel algo en éditant une liste d'étapes, sans recompiler.
// ============================================================================

import type { BidDecision, CardDecision } from '../../domain/types';
import type { AlgoSpec } from '../AlgoSpec';
import type { RobotBrain } from '../RobotBrain';
import type { RobotAlgorithm, RobotContext } from '../algorithm/RobotAlgorithm';
import { runPipeline, type BidDraft, type FlagDraft, type PlayDraft, type StepRef } from './steps';

export interface AlgoWorkflow {
  bid: StepRef[];
  play: StepRef[];
  contre: StepRef[];
  surcontre: StepRef[];
}

/** Workflow par défaut : reproduit (et structure) le comportement courant. */
export const DEFAULT_WORKFLOW: AlgoWorkflow = {
  bid: [{ step: 'bid.convention' }, { step: 'bid.guardRaise' }, { step: 'bid.finalize' }],
  play: [
    { step: 'play.init' },
    { step: 'play.forcedSingle' },
    { step: 'play.winIfBeneficial', params: { minAggressiveness: 3 } },
    { step: 'play.sortEconomical' },
    { step: 'play.leadPreference', params: { minAggressiveness: 6 } },
    { step: 'play.decide' },
  ],
  contre: [{ step: 'flag.requireContre' }, { step: 'flag.opponentRisk', params: { threshold: 0.65 } }],
  surcontre: [{ step: 'flag.requireSurcontre' }, { step: 'flag.ownStrength', params: { threshold: 0.8 } }],
};

export class WorkflowAlgorithm implements RobotAlgorithm {
  readonly id: string;
  readonly name: string;

  constructor(
    private readonly brain: RobotBrain,
    readonly spec: AlgoSpec,
    private readonly workflow: AlgoWorkflow,
    readonly responseTimeMs: number,
    readonly maxPlayTimeMs: number,
  ) {
    this.id = `workflow:${spec.name}`;
    this.name = spec.name;
  }

  decideBid(ctx: RobotContext): BidDecision {
    const draft: BidDraft = { action: 'pass', thinkMultiplier: 1, done: false, notes: [] };
    // L'étape 'bid.convention' délègue à la convention vérifiée du cerveau.
    const conventionDecide = (c: RobotContext) => this.brain.decideBid(c.hand, c.table, c.seat, c.partnerSeat);
    runPipeline(ctx, this.workflow.bid, draft, { __conventionDecide: conventionDecide });
    return { action: draft.action, value: draft.value, suit: draft.suit, saySuit: draft.saySuit, thinkMultiplier: draft.thinkMultiplier, reason: draft.reason ?? '' };
  }

  decideCard(ctx: RobotContext): CardDecision {
    const draft: PlayDraft = { candidates: [], tryingToWin: false, thinkMultiplier: 1, done: false, notes: [] };
    runPipeline(ctx, this.workflow.play, draft);
    const card = (draft.card ?? ctx.legalCards[0])!;
    return { card, thinkMultiplier: draft.thinkMultiplier, reason: draft.reason ?? '' };
  }

  shouldContre(ctx: RobotContext): boolean {
    if (!this.spec.contre.enabled) return false;
    const draft: FlagDraft = { flag: false, score: 0, done: false, notes: [] };
    runPipeline(ctx, this.workflow.contre, draft);
    return draft.flag;
  }

  shouldSurcontre(ctx: RobotContext): boolean {
    if (!this.spec.contre.enabled) return false;
    const draft: FlagDraft = { flag: false, score: 0, done: false, notes: [] };
    runPipeline(ctx, this.workflow.surcontre, draft);
    return draft.flag;
  }
}
