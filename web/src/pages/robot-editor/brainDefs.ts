// ============================================================================
//  Définitions de l'éditeur de cerveau — les 5 fonctions du contrat RobotAlgorithm,
//  le contexte accessible (RobotContext + AlgoSpec), et des extraits pré-remplis.
//  Extensible : ajouter une entrée ici crée un nouvel onglet de fonction.
// ============================================================================

export interface BrainFn {
  key: string;
  label: string;
  returns: string;
  signature: string;
  doc: string;
  /** Corps JS par défaut (le scripteur édite à partir de là). */
  defaultBody: string;
}

/** Les 5 fonctions du cerveau (extensible — on peut en ajouter d'autres). */
export const BRAIN_FNS: BrainFn[] = [
  {
    key: 'decideBid',
    label: 'decideBid',
    returns: 'BidDecision',
    signature: 'decideBid(ctx): BidDecision',
    doc: "Décide l'enchère : passer, annoncer (valeur + couleur), capot, contrer.",
    defaultBody: `// Décide quoi annoncer.
// Accès : ctx.hand, ctx.spec, ctx.personality, ctx.table, ctx.legalBidInfo...
const aces = ctx.hand.filter(c => c.rank === 'A').length;
this.log.info('enchere', \`J'ai \${aces} As, agressivité \${ctx.personality.aggressiveness}\`);

// Exemple : capot si 3+ As et partenaire a ouvert fort
const partnerBid = ctx.partnerBid;
if (partnerBid && partnerBid.value >= 110 && aces >= 3) {
  return this.bid('capot', { suit: partnerBid.suit, reason: 'capot 3 As + partenaire fort' });
}

// Probabilité d'ouvrir modulée par l'agressivité
const p = ctx.personality.aggressiveness / 10;
if (aces >= 2 && Math.random() < p) {
  return this.bid('bid', { value: 90, suit: 'pique', saySuit: true, reason: 'ouverture opportuniste' });
}

return this.bid('pass', { reason: 'main insuffisante' });`,
  },
  {
    key: 'decideCard',
    label: 'decideCard',
    returns: 'CardDecision',
    signature: 'decideCard(ctx): CardDecision',
    doc: 'Choisit la carte à jouer parmi les cartes légales (ctx.legalCards).',
    defaultBody: `// Choisit la carte à jouer.
// ctx.legalCards = cartes jouables (déjà filtrées par les règles).
const legal = ctx.legalCards;
if (legal.length === 1) return this.play(legal[0], 'coup forcé');

const trump = ctx.table.trump;

// Cartes qui gagnent le pli
const winning = legal.filter(c => this.helpers.wouldWin(c, ctx));
if (winning.length > 0) {
  // Agressivité haute = garde les grosses (joue la gagnante faible)
  // [...] clone avant tri pour ne pas muter ctx.legalCards
  const sorted = [...winning].sort((a, b) => this.helpers.strength(a, trump) - this.helpers.strength(b, trump));
  const p = ctx.personality.aggressiveness / 10;
  const chosen = Math.random() < p ? sorted[0] : sorted[sorted.length - 1];
  this.log.info('jeu', \`Maître : je joue \${chosen.rank}\${chosen.suit}\`);
  return this.play(chosen, 'choix modulé par agressivité');
}

// Sinon : défausse la plus faible (clone avant tri)
const weakest = [...legal].sort((a, b) => this.helpers.value(a, trump) - this.helpers.value(b, trump))[0];
return this.play(weakest, 'défausse minimale');`,
  },
  {
    key: 'shouldContre',
    label: 'shouldContre',
    returns: 'boolean',
    signature: 'shouldContre(ctx): boolean',
    doc: "Décide si le robot contre l'annonce adverse en cours.",
    defaultBody: `// Décide si on contre l'adversaire.
if (!ctx.spec.contre.enabled || !ctx.legalBidInfo.canContre) return false;

const bid = ctx.table.currentBid;
if (!bid || !bid.suit) return false;

// Risque de chute adverse estimé (0..1), modulé par l'agressivité
const myTrumps = ctx.hand.filter(c => c.suit === bid.suit).length;
const aces = ctx.hand.filter(c => c.rank === 'A' && c.suit !== bid.suit).length;
let risk = (bid.value - 80) / 120;
risk += myTrumps >= 3 ? 0.25 : 0;
risk += aces * 0.08;
risk += (ctx.personality.aggressiveness - 5) * 0.03;

this.log.info('contre', \`Risque adverse estimé : \${risk.toFixed(2)}\`);
return risk >= ctx.spec.contre.minOpponentRiskToContre;`,
  },
  {
    key: 'shouldSurcontre',
    label: 'shouldSurcontre',
    returns: 'boolean',
    signature: 'shouldSurcontre(ctx): boolean',
    doc: 'Décide si le robot surcoinche après un contre adverse.',
    defaultBody: `// Décide si on surcoinche.
if (!ctx.spec.contre.enabled || !ctx.legalBidInfo.canSurcontre) return false;

const bid = ctx.table.currentBid;
if (!bid || !bid.suit) return false;

// Force propre estimée (0..1)
const t = ctx.hand.filter(c => c.suit === bid.suit);
const hasJack = t.some(c => c.rank === 'V');
const hasNine = t.some(c => c.rank === '9');
const aces = ctx.hand.filter(c => c.rank === 'A').length;
let strength = t.length * 0.12 + (hasJack ? 0.3 : 0) + (hasNine ? 0.2 : 0) + aces * 0.1;
strength += (ctx.personality.aggressiveness - 5) * 0.02;

this.log.info('surcontre', \`Force propre : \${strength.toFixed(2)}\`);
return strength >= ctx.spec.contre.minOwnStrengthToSurcontre;`,
  },
];

// ----------------------------------------------------------------------------
//  Le CONTEXTE accessible dans les fonctions (palette cliquable)
// ----------------------------------------------------------------------------

export interface CtxEntry { path: string; type: string; desc: string }
export interface CtxGroup { group: string; color: string; entries: CtxEntry[] }

export const CONTEXT_REFERENCE: CtxGroup[] = [
  {
    group: 'Identité', color: '#3D8EE8', entries: [
      { path: 'ctx.seat', type: 'Seat', desc: 'Mon siège (0..3)' },
      { path: 'ctx.partnerSeat', type: 'Seat', desc: 'Siège de mon partenaire' },
      { path: 'ctx.myTeam', type: "'A'|'B'", desc: 'Mon équipe' },
      { path: 'ctx.isDemandeur', type: 'boolean', desc: 'Suis-je le preneur ?' },
      { path: 'ctx.partnerIsDemandeur', type: 'boolean', desc: 'Mon partenaire est preneur ?' },
    ],
  },
  {
    group: 'Ma main', color: '#2DD4A0', entries: [
      { path: 'ctx.hand', type: 'Card[]', desc: 'Mes cartes { rank, suit }' },
      { path: 'ctx.legalCards', type: 'Card[]', desc: 'Cartes jouables (jeu)' },
    ],
  },
  {
    group: 'Personnalité / Génome', color: '#8B5CF6', entries: [
      { path: 'ctx.personality.aggressiveness', type: '0..10', desc: 'Agressivité' },
      { path: 'ctx.personality.concentration', type: '0..10', desc: 'Concentration' },
      { path: 'ctx.personality.velocity', type: '0..10', desc: 'Vélocité (vitesse)' },
      { path: 'ctx.spec.name', type: 'string', desc: 'Nom du cerveau' },
      { path: 'ctx.spec.bidding', type: 'object', desc: "Réglages d'enchère" },
      { path: 'ctx.spec.contre.minOpponentRiskToContre', type: 'number', desc: 'Seuil contre' },
      { path: 'ctx.spec.contre.minOwnStrengthToSurcontre', type: 'number', desc: 'Seuil surcontre' },
    ],
  },
  {
    group: 'Table', color: '#C9963A', entries: [
      { path: 'ctx.table.phase', type: "'bidding'|'play'", desc: 'Phase courante' },
      { path: 'ctx.table.trump', type: 'Suit|null', desc: 'Couleur d\'atout' },
      { path: 'ctx.table.bids', type: 'Bid[]', desc: 'Historique des annonces' },
      { path: 'ctx.table.currentBid', type: 'Bid|null', desc: 'Meilleure annonce' },
      { path: 'ctx.table.currentTrick', type: '{seat,card}[]', desc: 'Pli en cours' },
      { path: 'ctx.table.playedCards', type: '{seat,card}[]', desc: 'Cartes déjà jouées' },
      { path: 'ctx.table.trumpsRemaining', type: 'number', desc: 'Atouts restants' },
      { path: 'ctx.partnerBid', type: '{value,suit}', desc: 'Annonce du partenaire' },
    ],
  },
  {
    group: 'Légalité', color: '#E8714A', entries: [
      { path: 'ctx.legalBidInfo.minValue', type: 'number', desc: 'Annonce minimale' },
      { path: 'ctx.legalBidInfo.maxValue', type: 'number', desc: 'Annonce maximale' },
      { path: 'ctx.legalBidInfo.canContre', type: 'boolean', desc: 'Peut contrer ?' },
      { path: 'ctx.legalBidInfo.canSurcontre', type: 'boolean', desc: 'Peut surcontrer ?' },
    ],
  },
];

// ----------------------------------------------------------------------------
//  Les HELPERS disponibles dans le scope des fonctions
// ----------------------------------------------------------------------------

export const HELPERS_REFERENCE: { sig: string; desc: string }[] = [
  { sig: "this.log.info(cat, msg)", desc: 'Journalise (info). cat = enchere|jeu|contre...' },
  { sig: "this.log.debug(cat, msg)", desc: 'Journalise (debug)' },
  { sig: "this.log.warn(cat, msg)", desc: 'Journalise (warn)' },
  { sig: "this.bid(action, opts)", desc: "Crée une BidDecision. action='pass'|'bid'|'capot'|'contree'|'surcontree'" },
  { sig: "this.play(card, reason)", desc: 'Crée une CardDecision' },
  { sig: "this.helpers.strength(card, trump)", desc: 'Force d\'une carte (ordre de coupe)' },
  { sig: "this.helpers.value(card, trump)", desc: 'Valeur en points d\'une carte' },
  { sig: "this.helpers.wouldWin(card, ctx)", desc: 'true si la carte remporte le pli courant' },
  { sig: "this.helpers.countSuit(hand, suit)", desc: 'Nombre de cartes d\'une couleur' },
];

// ----------------------------------------------------------------------------
//  Extraits (snippets) insérables
// ----------------------------------------------------------------------------

export const SNIPPETS: { label: string; code: string }[] = [
  { label: 'Compter mes As', code: "const aces = ctx.hand.filter(c => c.rank === 'A').length;" },
  { label: 'Compter mes atouts', code: "const myTrumps = ctx.hand.filter(c => c.suit === ctx.table.trump).length;" },
  { label: 'Probabilité par agressivité', code: "const p = ctx.personality.aggressiveness / 10;\nif (Math.random() < p) {\n  // action agressive\n}" },
  { label: 'Annonce du partenaire', code: "const partnerBid = ctx.partnerBid;\nif (partnerBid && partnerBid.value >= 110) {\n  // ...\n}" },
  { label: 'Annoncer un capot', code: "return this.bid('capot', { suit: ctx.table.trump, reason: 'capot' });" },
  { label: 'Monter de N', code: "return this.bid('bid', { value: ctx.table.currentBid.value + 30, suit: ctx.table.trump, saySuit: true, reason: '+30' });" },
  { label: 'Log + retour passe', code: "this.log.info('enchere', 'je passe');\nreturn this.bid('pass', { reason: 'rien à signaler' });" },
];
