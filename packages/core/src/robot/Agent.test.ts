import { describe, it, expect } from 'vitest';
import { createAgent } from './Agent';
import { ALGO_AGRESSIF, ALGO_CLASSIQUE, DEFAULT_ALGO } from './AlgoSpec';
import type { RobotContext } from './algorithm/RobotAlgorithm';
import type { Card, Suit } from '../domain/cards';
import type { TableContext } from '../domain/types';

const card = (rank: string, suit: Suit): Card => ({ rank, suit }) as any;

/** Contexte synthétique minimal — AUCUN moteur, AUCUN réseau. */
function context(hand: Card[], partial: Partial<RobotContext> = {}): RobotContext {
  const table: TableContext = {
    phase: 'bidding', trump: null, bidderSeat: null, bids: [], currentBid: null,
    contre: 'none', playedCards: [], currentTrick: [], trumpsRemaining: 8, trumpsUnseen: [],
  };
  return {
    seat: 0 as any, partnerSeat: 2 as any, myTeam: 'A', personality: DEFAULT_ALGO.personality,
    spec: DEFAULT_ALGO, hand, table, isDemandeur: false, partnerIsDemandeur: false,
    legalCards: hand,
    legalBidInfo: { minValue: 90, maxValue: 180, canContre: false, canSurcontre: false },
    trumpsPlayed: 0, trumpsRemaining: 8, trumpsUnseen: [],
    ...partial,
  } as RobotContext;
}

describe('Agent — individu autonome instancie depuis une spec seule', () => {
  it('resout le genome (preset Agressif) sans moteur', () => {
    const agent = createAgent({ id: 'bot-1', spec: ALGO_AGRESSIF });
    expect(agent.id).toBe('bot-1');
    expect(agent.spec.name).toBe('Agressif');
    expect(agent.spec.personality.aggressiveness).toBe(9);
  });

  it('fusionne une spec partielle avec les defauts (genome defensif)', () => {
    const agent = createAgent({ spec: { name: 'Maison', personality: { aggressiveness: 7 } as any } });
    expect(agent.spec.name).toBe('Maison');
    expect(agent.spec.personality.aggressiveness).toBe(7);
    expect(agent.spec.personality.concentration).toBe(DEFAULT_ALGO.personality.concentration); // herite du defaut
    expect(agent.spec.contre.enabled).toBe(DEFAULT_ALGO.contre.enabled);
  });

  it('deux specs -> deux individus distincts', () => {
    const a = createAgent({ spec: ALGO_CLASSIQUE });
    const b = createAgent({ spec: ALGO_AGRESSIF });
    expect(a.spec.personality.aggressiveness).not.toBe(b.spec.personality.aggressiveness);
  });

  it('DECIDE une enchere en isolation (fonction pure contexte -> decision)', () => {
    const agent = createAgent({ spec: ALGO_CLASSIQUE });
    const strong = [card('V', 'pique'), card('9', 'pique'), card('A', 'pique'), card('10', 'pique'), card('R', 'pique'), card('A', 'coeur'), card('A', 'trefle'), card('A', 'carreau')];
    const decision = agent.decideBid(context(strong));
    expect(['pass', 'bid', 'contree', 'surcontree']).toContain(decision.action);
    expect(typeof decision.reason).toBe('string');
  });

  it('DECIDE une carte en isolation (renvoie une carte legale)', () => {
    const agent = createAgent({ spec: ALGO_CLASSIQUE });
    const hand = [card('A', 'pique'), card('7', 'coeur')];
    const ctx = context(hand, { table: { ...context(hand).table, phase: 'play', trump: 'pique' }, legalCards: hand });
    const decision = agent.decideCard(ctx);
    expect(hand.some((c) => c.rank === decision.card.rank && c.suit === decision.card.suit)).toBe(true);
  });
});
