// ============================================================================
//  WORKFLOW DE DÉCISION — l'algo d'un robot = une SUITE DE FONCTIONS PURES.
//  Chaque étape analyse le jeu (RobotContext, lecture seule), affine un
//  « brouillon » de décision, puis passe la main à l'étape suivante. Le pipeline
//  est décrit en JSON (liste d'étapes + paramètres), donc clonable et extensible :
//  pour un nouvel algo, on réordonne/ajoute des étapes ou on enregistre les siennes.
// ============================================================================

import { cardStrength, cardValue, type Card, type Suit } from '../../domain/cards';
import type { Seat } from '../../domain/types';
import type { RobotContext } from '../algorithm/RobotAlgorithm';

// ---- brouillons de décision (l'état qui circule entre les étapes) ----------

export interface BidDraft {
  action: 'pass' | 'bid' | 'contree' | 'surcontree';
  value?: number;
  suit?: Suit;
  saySuit?: boolean;
  thinkMultiplier: number;
  reason?: string;
  done: boolean;
  notes: string[];
}
export interface PlayDraft {
  candidates: Card[];
  tryingToWin: boolean;
  card?: Card;
  thinkMultiplier: number;
  reason?: string;
  done: boolean;
  notes: string[];
}
export interface FlagDraft {
  flag: boolean;
  score: number;
  done: boolean;
  notes: string[];
}

export type StepFn = (ctx: RobotContext, draft: any, params: Record<string, any>) => void;

export interface StepRef {
  step: string;
  params?: Record<string, any>;
}

// ---- registre des étapes ----------------------------------------------------

const registry = new Map<string, StepFn>();
export function registerStep(name: string, fn: StepFn): void { registry.set(name, fn); }
export function getStep(name: string): StepFn | undefined { return registry.get(name); }
export function listSteps(): string[] { return [...registry.keys()]; }

// ---- helpers d'analyse (purs) ----------------------------------------------

function trickMasterSeat(trick: { seat: Seat; card: Card }[], trump: Suit): Seat | null {
  if (!trick.length) return null;
  const lead = trick[0].card.suit;
  const trumpsIn = trick.filter((t) => t.card.suit === trump);
  const pool = trumpsIn.length ? trumpsIn : trick.filter((t) => t.card.suit === lead);
  let best = pool[0];
  for (const t of pool) if (cardStrength(t.card, trump) > cardStrength(best.card, trump)) best = t;
  return best.seat;
}

function winningCandidates(ctx: RobotContext): Card[] {
  const trick = ctx.table.currentTrick;
  const trump = ctx.table.trump;
  if (!trump || trick.length === 0) return [];
  const lead = trick[0].card.suit;
  const trumpsIn = trick.filter((t) => t.card.suit === trump);
  const someTrump = trumpsIn.length > 0;
  const bestStrength = someTrump
    ? Math.max(...trumpsIn.map((t) => cardStrength(t.card, trump)))
    : Math.max(...trick.filter((t) => t.card.suit === lead).map((t) => cardStrength(t.card, trump)));
  return ctx.legalCards.filter((c) => {
    if (someTrump) return c.suit === trump && cardStrength(c, trump) > bestStrength;
    if (c.suit === trump) return true; // couper = remporter
    return c.suit === lead && cardStrength(c, trump) > bestStrength;
  });
}

// ============================================================================
//  ÉTAPES PAR DÉFAUT
// ============================================================================

// ---- enchères --------------------------------------------------------------

/** Délègue l'ouverture/réponse à la convention (logique vérifiée), via le contexte. */
registerStep('bid.convention', (ctx, draft: BidDraft, params) => {
  const fn = params.__conventionDecide as ((ctx: RobotContext) => Partial<BidDraft>) | undefined;
  if (!fn) return;
  const d = fn(ctx);
  Object.assign(draft, d);
});

/** Garde-fou : impossible d'annoncer en dessous ou égal au contrat courant -> passe. */
registerStep('bid.guardRaise', (ctx, draft: BidDraft) => {
  const highest = ctx.table.currentBid?.value ?? 0;
  if (draft.action === 'bid' && (draft.value ?? 0) <= highest) {
    draft.action = 'pass';
    draft.notes.push('relance impossible -> passe');
  }
});

registerStep('bid.finalize', (_ctx, draft: BidDraft) => { draft.done = true; });

// ---- contre / surcontre ----------------------------------------------------

registerStep('flag.requireContre', (ctx, draft: FlagDraft) => {
  if (!ctx.legalBidInfo.canContre) { draft.flag = false; draft.done = true; }
});
registerStep('flag.requireSurcontre', (ctx, draft: FlagDraft) => {
  if (!ctx.legalBidInfo.canSurcontre) { draft.flag = false; draft.done = true; }
});
registerStep('flag.opponentRisk', (ctx, draft: FlagDraft, params) => {
  const bid = ctx.table.currentBid;
  const trump = bid?.suit;
  if (!trump) { draft.flag = false; draft.done = true; return; }
  const t = ctx.hand.filter((c) => c.suit === trump);
  const strong = t.some((c) => c.rank === 'V' || c.rank === '9');
  const aces = ctx.hand.filter((c) => c.rank === 'A' && c.suit !== trump).length;
  let risk = ((bid?.value ?? 90) - 80) / 120;
  risk += t.length >= 3 ? 0.25 : t.length >= 2 ? 0.12 : 0;
  risk += strong ? 0.2 : 0;
  risk += aces * 0.08 + (ctx.personality.aggressiveness - 5) * 0.03;
  draft.score = Math.max(0, Math.min(1, risk));
  draft.flag = draft.score >= (params.threshold ?? 0.65);
  draft.done = true;
});
registerStep('flag.ownStrength', (ctx, draft: FlagDraft, params) => {
  const trump = ctx.table.currentBid?.suit;
  if (!trump) { draft.flag = false; draft.done = true; return; }
  const t = ctx.hand.filter((c) => c.suit === trump);
  let s = t.length * 0.12 + (t.some((c) => c.rank === 'V') ? 0.3 : 0) + (t.some((c) => c.rank === '9') ? 0.2 : 0);
  s += ctx.hand.filter((c) => c.rank === 'A').length * 0.1 + (ctx.personality.aggressiveness - 5) * 0.02;
  draft.score = Math.max(0, Math.min(1, s));
  draft.flag = draft.score >= (params.threshold ?? 0.8);
  draft.done = true;
});

// ---- jeu de la carte (chaque étape RÉTRÉCIT les candidats) ------------------

registerStep('play.init', (ctx, draft: PlayDraft) => {
  draft.candidates = [...ctx.legalCards];
});
registerStep('play.forcedSingle', (_ctx, draft: PlayDraft) => {
  if (draft.candidates.length <= 1) { draft.card = draft.candidates[0]; draft.done = true; draft.reason = 'coup forcé'; }
});
registerStep('play.winIfBeneficial', (ctx, draft: PlayDraft, params) => {
  const trump = ctx.table.trump;
  if (!trump || ctx.table.currentTrick.length === 0) return; // on entame : pas de notion de « gagner »
  const master = trickMasterSeat(ctx.table.currentTrick, trump);
  if (master === ctx.partnerSeat) { draft.notes.push('partenaire maître : on ne gaspille pas'); return; }
  const minAggr = (params.minAggressiveness as number) ?? 0;
  if (ctx.personality.aggressiveness < minAggr) return;
  const winners = winningCandidates(ctx).filter((c) => draft.candidates.some((d) => d.rank === c.rank && d.suit === c.suit));
  if (winners.length) { draft.candidates = winners; draft.tryingToWin = true; draft.notes.push('on cherche à remporter le pli'); }
});
registerStep('play.sortEconomical', (ctx, draft: PlayDraft) => {
  const trump = ctx.table.trump as Suit;
  draft.candidates = [...draft.candidates].sort((a, b) => cardValue(a, trump) - cardValue(b, trump));
});
registerStep('play.leadPreference', (ctx, draft: PlayDraft, params) => {
  if (ctx.table.currentTrick.length > 0) return; // s'applique seulement à l'entame
  const trump = ctx.table.trump as Suit;
  const aggressive = ctx.personality.aggressiveness >= ((params.minAggressiveness as number) ?? 6);
  // Agressif : sort le plus fort (atout maître / as) ; sinon : conserve le tri économique.
  if (aggressive) draft.candidates = [...draft.candidates].sort((a, b) => cardStrength(b, trump) - cardStrength(a, trump));
});
registerStep('play.decide', (_ctx, draft: PlayDraft) => {
  draft.card = draft.candidates[0];
  draft.done = true;
  draft.reason = draft.reason ?? (draft.tryingToWin ? 'plus petite carte gagnante' : 'défausse économique');
});

// ---- exécuteur de pipeline --------------------------------------------------

export function runPipeline(ctx: RobotContext, steps: StepRef[], draft: any, extraParams: Record<string, any> = {}): any {
  for (const ref of steps) {
    const fn = registry.get(ref.step);
    if (!fn) { draft.notes.push(`étape inconnue: ${ref.step}`); continue; }
    fn(ctx, draft, { ...(ref.params ?? {}), ...extraParams });
    if (draft.done) break;
  }
  return draft;
}
