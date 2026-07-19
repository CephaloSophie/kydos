// ============================================================================
//  Contexte éditable de l'éditeur de cerveau — distribution de cartes (comme
//  dans le jeu), et construction du RobotContext d'aperçu à partir des réglages.
// ============================================================================

export const RANKS = ['7', '8', '9', '10', 'V', 'D', 'R', 'A'] as const;
export const SUITS = ['pique', 'coeur', 'carreau', 'trefle'] as const;
export const SUIT_SYM: Record<string, string> = { pique: '♠', coeur: '♥', carreau: '♦', trefle: '♣' };
export const SUIT_RED = (s: string) => s === 'coeur' || s === 'carreau';

export interface DCard { rank: string; suit: string }

/** Distribue une main de 8 cartes distinctes (jeu de 32), comme une vraie donne. */
export function dealHand(rng: () => number = Math.random): DCard[] {
  const deck: DCard[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 8);
}

/** Réglages éditables du contexte d'aperçu (le scripteur les manipule à l'écran). */
export interface CtxSettings {
  hand: DCard[];
  trump: string;
  aggressiveness: number;
  concentration: number;
  velocity: number;
  phase: 'bidding' | 'play';
  partnerBidValue: number;
  partnerBidSuit: string;
  currentBidValue: number;
  currentBidSuit: string;
  canContre: boolean;
  canSurcontre: boolean;
  /** AlgoSpec complète (génome) éditable — vue/modifiable en JSON. */
  spec: any;
}

/** AlgoSpec par défaut (génome) — éditable par le scripteur. */
export function defaultSpec(): any {
  return {
    version: 1,
    name: 'MonCerveau',
    personality: { aggressiveness: 7, concentration: 6, velocity: 5 },
    bidding: {},
    contre: { enabled: true, minOpponentRiskToContre: 0.6, minOwnStrengthToSurcontre: 0.75 },
    play: { aggressiveness: 7 },
  };
}

export function defaultSettings(): CtxSettings {
  return {
    hand: dealHand(), trump: 'pique', aggressiveness: 7, concentration: 6, velocity: 5,
    phase: 'bidding', partnerBidValue: 110, partnerBidSuit: 'pique',
    currentBidValue: 110, currentBidSuit: 'pique', canContre: true, canSurcontre: false,
    spec: defaultSpec(),
  };
}

/** Construit le RobotContext d'aperçu à partir des réglages éditables. */
export function buildPreviewContext(s: CtxSettings) {
  const legalCards = s.phase === 'play' ? s.hand.slice(0, Math.max(1, Math.min(s.hand.length, 3))) : s.hand;
  // La personnalité affichée (sliders) prime et est injectée dans la spec.
  const personality = { aggressiveness: s.aggressiveness, concentration: s.concentration, velocity: s.velocity };
  const spec = { ...(s.spec ?? defaultSpec()), personality };
  return {
    seat: 2, partnerSeat: 0, myTeam: 'A', isDemandeur: false, partnerIsDemandeur: true,
    hand: s.hand,
    legalCards,
    personality,
    spec,
    table: {
      phase: s.phase, trump: s.trump, bids: [],
      currentBid: { seat: 1, value: s.currentBidValue, suit: s.currentBidSuit },
      currentTrick: [], playedCards: [], trumpsRemaining: 8,
    },
    partnerBid: { value: s.partnerBidValue, suit: s.partnerBidSuit },
    legalBidInfo: { minValue: s.currentBidValue + 10, maxValue: 180, canContre: s.canContre, canSurcontre: s.canSurcontre },
  };
}

/** Sérialise le contexte complet en JSON beautifié (pour l'édition). */
export function contextToJson(s: CtxSettings): string {
  return JSON.stringify(buildPreviewContext(s), null, 2);
}

/**
 * Applique un contexte JSON édité : renvoie un patch CtxSettings.
 * Modifier le JSON impacte donc les cartes affichées, les réglages et l'AlgoSpec.
 */
export function applyContextJson(json: string, prev: CtxSettings): { ok: boolean; settings?: CtxSettings; error?: string } {
  try {
    const o = JSON.parse(json);
    const p: CtxSettings = { ...prev };
    if (Array.isArray(o.hand)) p.hand = o.hand.map((c: any) => ({ rank: String(c.rank), suit: String(c.suit) }));
    if (o.table?.trump) p.trump = o.table.trump;
    if (o.table?.phase) p.phase = o.table.phase;
    if (o.personality) {
      if (typeof o.personality.aggressiveness === 'number') p.aggressiveness = o.personality.aggressiveness;
      if (typeof o.personality.concentration === 'number') p.concentration = o.personality.concentration;
      if (typeof o.personality.velocity === 'number') p.velocity = o.personality.velocity;
    }
    if (o.partnerBid) { if (typeof o.partnerBid.value === 'number') p.partnerBidValue = o.partnerBid.value; if (o.partnerBid.suit) p.partnerBidSuit = o.partnerBid.suit; }
    if (o.table?.currentBid) { if (typeof o.table.currentBid.value === 'number') p.currentBidValue = o.table.currentBid.value; if (o.table.currentBid.suit) p.currentBidSuit = o.table.currentBid.suit; }
    if (o.legalBidInfo) { if (typeof o.legalBidInfo.canContre === 'boolean') p.canContre = o.legalBidInfo.canContre; if (typeof o.legalBidInfo.canSurcontre === 'boolean') p.canSurcontre = o.legalBidInfo.canSurcontre; }
    if (o.spec) p.spec = o.spec;
    return { ok: true, settings: p };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
