// ============================================================================
//  GameEngine — orchestrateur PUR (aucune dépendance IA / réseau).
//  Le contrôleur (front en local, serveur en ligne) « tire » les tours :
//  whoseTurn -> contextFor -> (humain: UI / robot: cerveau) -> submitBid/playCard.
//
//  Hiérarchie : Partie -> Manches (course à 1500/2000, + labels) -> Donnes.
// ============================================================================

import {
  buildDeck,
  cardValue,
  handContains,
  sameCard,
  SUITS,
  type Card,
  type Suit,
} from '../domain/cards';
import type { Bid, ContreLevel, Seat, TableContext } from '../domain/types';
import { partnerOf, teamOf, type RulesEngine } from '../rules/RulesEngine';
import {
  type DonneRecord,
  type EnginePhase,
  type EnginePlayer,
  type EngineView,
  type MancheRecord,
  type Operation,
  type PartieConfig,
  type ReplayRecord,
} from './types';

type Team = 'A' | 'B';

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class GameEngine {
  phase: EnginePhase = 'bidding';
  private rng: () => number;

  // état partie
  manchesWon: { A: number; B: number } = { A: 0, B: 0 };
  manches: MancheRecord[] = [];
  partieWinner?: Team;

  // manche courante
  private mancheIndex = 0;
  private target: number;
  private isLabel = false;
  private labelKind?: 'petit' | 'grand';
  private cumulative: { A: number; B: number } = { A: 0, B: 0 };

  // donne courante
  private dealer: Seat = 0;
  private hands: Card[][] = [[], [], [], []];
  private bids: Bid[] = [];
  private passesSinceBid = 0;
  private highestBid: Bid | null = null;
  private contre: ContreLevel = 'none';
  private declaredCapot = false;
  /** Sièges du camp preneur encore en attente de décision pendant la phase surcontre. */
  private surcontrePending: Set<Seat> | null = null;
  trump: Suit | null = null;
  private bidderSeat: Seat | null = null;
  turn: Seat | null = null;
  private currentTrick: { seat: Seat; card: Card }[] = [];
  private currentTrickLeader: Seat | null = null;
  private awaitingCollect = false;
  private pendingWinnerSeat: Seat | null = null;
  private lastTrick: { plays: { seat: Seat; card: Card }[]; leaderSeat: Seat | null; winnerSeat: Seat | null } | null = null;
  private playedCards: { seat: Seat; card: Card }[] = [];
  private tricksWon: { A: number; B: number } = { A: 0, B: 0 };
  private pointsThisDonne: { A: number; B: number } = { A: 0, B: 0 };
  private lastTrickWinner: Seat | null = null;
  private donneOps: Operation[] = [];
  private currentDonneHands: Card[][] = [];

  readonly startedAt = Date.now();

  constructor(
    public players: EnginePlayer[],
    public config: PartieConfig,
    public rules: RulesEngine,
    seed?: number,
  ) {
    let s = seed ?? Date.now();
    this.rng = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    this.target = config.baseTarget;
    this.startManche(config.baseTarget, false);
    this.startDonne(0);
  }

  /** Siège suivant selon le sens de jeu (antihoraire par défaut). */
  private next(s: Seat): Seat {
    return ((s + (this.config.clockwise ? 3 : 1)) % 4) as Seat;
  }

  // ---- accès -----------------------------------------------------------------

  view(): EngineView {
    return {
      phase: this.phase,
      turn: this.turn,
      trump: this.trump,
      bidderSeat: this.bidderSeat,
      dealer: this.dealer,
      firstBidderSeat: this.next(this.dealer),
      currentBidValue: this.highestBid?.value ?? null,
      contre: this.contre,
      contreSeats: ([0, 1, 2, 3] as Seat[]).filter((s) => this.canContre(s)),
      surcontreSeats: ([0, 1, 2, 3] as Seat[]).filter((s) => this.canSurcontre(s)),
      bids: this.bids.slice(),
      currentTrick: this.currentTrick,
      currentTrickLeader: this.currentTrickLeader,
      awaitingCollect: this.awaitingCollect,
      pendingWinnerSeat: this.pendingWinnerSeat,
      lastTrick: this.lastTrick,
      manchesWon: this.manchesWon,
      cumulative: this.cumulative,
      belote: (() => {
        const seat = this.beloteSeat();
        if (seat == null) return null;
        return { seat, announcing: this.beloteAnnounceFlags[seat], playedCount: this.belotePlayedCount(seat) };
      })(),
      board: {
        donneRaw: { ...this.pointsThisDonne },
        tricks: { ...this.tricksWon },
        bidderTeam: this.bidderSeat != null ? teamOf(this.bidderSeat) : null,
      },
      target: this.target,
      mancheIndex: this.mancheIndex,
      isLabel: this.isLabel,
      labelKind: this.labelKind,
      clockwise: this.config.clockwise,
    };
  }

  handOf(seat: Seat): Card[] {
    return this.hands[seat];
  }

  /** Construit l'en-tête de contexte pour un robot occupant `seat`. */
  contextFor(seat: Seat): TableContext {
    const trump = this.trump;
    const seenTrumps = trump ? this.playedCards.filter((p) => p.card.suit === trump).length : 0;
    const myTrumps = trump ? this.hands[seat].filter((c) => c.suit === trump) : [];
    const allTrumps: Card[] = trump ? SUITS.includes(trump) ? buildDeck().filter((c) => c.suit === trump) : [] : [];
    const unseen = allTrumps.filter(
      (c) =>
        !this.playedCards.some((p) => sameCard(p.card, c)) &&
        !myTrumps.some((m) => sameCard(m, c)),
    );
    return {
      phase: this.phase === 'playing' ? 'play' : 'bidding',
      trump,
      bidderSeat: this.bidderSeat,
      bids: this.bids,
      currentBid: this.highestBid,
      contre: this.contre,
      playedCards: this.playedCards,
      currentTrick: this.currentTrick,
      trumpsRemaining: trump ? 8 - seenTrumps : 0,
      trumpsUnseen: unseen,
    };
  }

  // ---- manche / donne lifecycle ---------------------------------------------

  private startManche(target: number, isLabel: boolean, labelKind?: 'petit' | 'grand') {
    this.mancheIndex += 1;
    this.target = target;
    this.isLabel = isLabel;
    this.labelKind = labelKind;
    this.cumulative = { A: 0, B: 0 };
    this.manches.push({
      index: this.mancheIndex,
      target,
      isLabel,
      labelKind,
      donnes: [],
      cumulative: { A: 0, B: 0 },
    });
  }

  private startDonne(dealer: Seat) {
    this.dealer = dealer;
    const deck = shuffle(buildDeck(), this.rng);
    this.hands = [deck.slice(0, 8), deck.slice(8, 16), deck.slice(16, 24), deck.slice(24, 32)];
    this.currentDonneHands = this.hands.map((h) => h.map((c) => ({ ...c })));
    this.beloteAnnounceFlags = [true, true, true, true];
    this.bids = [];
    this.passesSinceBid = 0;
    this.highestBid = null;
    this.contre = 'none';
    this.declaredCapot = false;
    this.surcontrePending = null;
    this.trump = null;
    this.bidderSeat = null;
    this.currentTrick = [];
    this.currentTrickLeader = null;
    this.awaitingCollect = false;
    this.pendingWinnerSeat = null;
    this.lastTrick = null;
    this.playedCards = [];
    this.tricksWon = { A: 0, B: 0 };
    this.pointsThisDonne = { A: 0, B: 0 };
    this.lastTrickWinner = null;
    this.donneOps = [];
    this.phase = 'bidding';
    this.turn = this.next(dealer);
    this.op('deal', { dealer });
  }

  private op(type: Operation['type'], data: Record<string, unknown>, seat?: Seat) {
    this.donneOps.push({ type, at: Date.now(), data, seat });
  }

  // ---- enchères --------------------------------------------------------------

  legalBidInfo(seat: Seat) {
    const highest = this.highestBid;
    return {
      canPass: true,
      minValue: highest?.value ? highest.value + 10 : this.rules.minBid,
      maxValue: this.rules.maxBid,
      suits: SUITS,
      canContre: this.canContre(seat),
      canSurcontre: this.canSurcontre(seat),
    };
  }

  submitBid(seat: Seat, bid: Omit<Bid, 'seat'>): { ok: boolean; error?: string } {
    // --- Surcontre : uniquement pendant la micro-phase dédiée, par un siège du camp
    //     preneur encore en attente. Le surcontre clôt immédiatement pour les deux.
    if (bid.action === 'surcontree') {
      if (this.phase !== 'surcontre' || !this.surcontrePending?.has(seat)) return { ok: false, error: 'surcontre' };
      this.contre = 'surcontree';
      this.bids.push({ seat, action: 'surcontree' });
      this.op('bid', { action: 'surcontree' }, seat);
      this.surcontrePending = null;
      this.closeBidding();
      return { ok: true };
    }

    // --- Pendant la phase surcontre : seul un PASS d'un siège preneur en attente est accepté.
    if (this.phase === 'surcontre') {
      if (bid.action !== 'pass' || !this.surcontrePending?.has(seat)) return { ok: false, error: 'surcontre_phase' };
      this.surcontrePending.delete(seat);
      this.op('bid', { action: 'pass' }, seat);
      if (this.surcontrePending.size === 0) { this.surcontrePending = null; this.closeBidding(); } // les deux ont passé → on joue le contré
      else this.turn = [...this.surcontrePending][0]; // l'autre doit encore décider
      return { ok: true };
    }

    // --- Contre : réflexe hors-tour. Le PREMIER adversaire qui contre VERROUILLE l'enchère
    //     (son partenaire perd la main et toute saisie en cours), puis on ouvre la phase surcontre.
    if (bid.action === 'contree') {
      if (this.phase !== 'bidding') return { ok: false, error: 'phase' };
      if (!this.canContre(seat)) return { ok: false, error: 'contre' };
      this.contre = 'contree';
      this.bids.push({ seat, action: 'contree' });
      this.op('bid', { action: 'contree' }, seat);
      this.enterSurcontrePhase();
      return { ok: true };
    }

    if (this.phase !== 'bidding') return { ok: false, error: 'phase' };
    if (this.turn !== seat) return { ok: false, error: 'turn' };

    // --- Capot annoncé : on ne peut pas le contrer -> clôture immédiate, le jeu commence.
    if (bid.action === 'capot') {
      const resolved = this.resolveBidSuit(seat, bid);
      if (!resolved.ok) return { ok: false, error: resolved.error };
      const signals = this.resolveSignals(bid);
      const placed: Bid = { seat, action: 'capot', value: 250, suit: resolved.suit, saidSuit: resolved.saidSuit, reflexion: signals.reflexion, repeatPartnerSuit: signals.repeatPartnerSuit, reason: bid.reason };
      this.bids.push(placed);
      this.highestBid = placed;
      this.declaredCapot = true;
      this.contre = 'none';
      this.op('bid', { ...placed }, seat);
      this.closeBidding();
      return { ok: true };
    }

    if (bid.action === 'pass') {
      // Interdit de « réfléchir » ou de « répéter » sans monter l'enchère (= influence).
      if (bid.reflexion || bid.repeatPartnerSuit) return { ok: false, error: 'signal sans annonce' };
      this.bids.push({ seat, action: 'pass' });
      this.op('bid', { action: 'pass' }, seat);
      this.passesSinceBid += 1;
      // 4 passes sans annonce -> redonne ; 3 passes après une annonce -> fin.
      if (!this.highestBid && this.passesSinceBid >= 4) {
        this.startDonne(this.next(this.dealer));
        return { ok: true };
      }
      if (this.highestBid && this.passesSinceBid >= 3) this.closeBidding();
      else this.advanceBidTurn();
      return { ok: true };
    }

    // bid normal
    // Contrée: every announced value must be a multiple of 10.
    if (bid.action === 'bid' && (bid.value == null || bid.value % 10 !== 0)) {
      return { ok: false, error: `Annonce invalide : ${bid.value} n'est pas un multiple de 10.` };
    }
    const min = this.highestBid?.value ? this.highestBid.value + 10 : this.rules.minBid;
    if (!bid.value || bid.value < min) return { ok: false, error: `min ${min}` };
    const resolved = this.resolveBidSuit(seat, bid);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    const signals = this.resolveSignals(bid);
    const placed: Bid = { seat, action: 'bid', value: bid.value, suit: resolved.suit, saidSuit: resolved.saidSuit, reflexion: signals.reflexion, repeatPartnerSuit: signals.repeatPartnerSuit, reason: bid.reason };
    this.bids.push(placed);
    this.highestBid = placed;
    this.declaredCapot = false;
    this.contre = 'none';
    this.op('bid', { ...placed }, seat);
    this.passesSinceBid = 0;
    this.advanceBidTurn();
    return { ok: true };
  }

  /** Dernière couleur annoncée par le partenaire (siège +2), si elle existe. */
  private partnerLastSuit(seat: Seat): Suit | null {
    const partner = ((seat + 2) % 4) as Seat;
    for (let i = this.bids.length - 1; i >= 0; i--) {
      const b = this.bids[i];
      if (b.seat === partner && b.suit) return b.suit;
    }
    return null;
  }

  /**
   * Résout la couleur d'une annonce montante (option A) :
   *  - couleur explicitement nommée  → affichée (saidSuit = true) ;
   *  - drapeau « répéter le partenaire » → couleur du partenaire, NON affichée (saidSuit = false),
   *    refusée si le partenaire n'a pas encore nommé de couleur, ou si le signal est désactivé ;
   *  - ni l'un ni l'autre → refusée (le joueur doit choisir).
   * Un robot fournit toujours `suit` (avec saidSuit true/false) : ce chemin reste compatible.
   */
  private resolveBidSuit(seat: Seat, bid: Omit<Bid, 'seat'>): { ok: true; suit: Suit; saidSuit: boolean } | { ok: false; error: string } {
    if (bid.suit) return { ok: true, suit: bid.suit, saidSuit: bid.saidSuit ?? true };
    const repeatEnabled = this.config.signals?.repeatSuit !== false;
    if (bid.repeatPartnerSuit && repeatEnabled) {
      const partnerSuit = this.partnerLastSuit(seat);
      if (!partnerSuit) return { ok: false, error: 'aucune couleur du coéquipier à répéter' };
      return { ok: true, suit: partnerSuit, saidSuit: false };
    }
    return { ok: false, error: 'choisir une couleur ou répéter celle du coéquipier' };
  }

  /** Normalise les signaux selon la config de la table (un signal désactivé est ignoré). */
  private resolveSignals(bid: Omit<Bid, 'seat'>): { reflexion: boolean; repeatPartnerSuit: boolean } {
    const allowReflexion = this.config.signals?.reflexion !== false;
    const allowRepeat = this.config.signals?.repeatSuit !== false;
    return {
      reflexion: !!bid.reflexion && allowReflexion,
      repeatPartnerSuit: !!bid.repeatPartnerSuit && allowRepeat,
    };
  }

  /** Index de la dernière annonce (bid/capot) dans la liste des enchères. */
  private idxHighestBid(): number {
    for (let i = this.bids.length - 1; i >= 0; i--) {
      const a = this.bids[i].action;
      if (a === 'bid' || a === 'capot') return i;
    }
    return -1;
  }
  /** Sièges ayant passé DEPUIS la dernière annonce (encode le sens de jeu réel). */
  private passedSinceHighest(): Set<Seat> {
    const idx = this.idxHighestBid();
    const set = new Set<Seat>();
    for (let j = idx + 1; j < this.bids.length; j++) if (this.bids[j].action === 'pass') set.add(this.bids[j].seat);
    return set;
  }
  /**
   * Un joueur de l'équipe défensive peut coincher tant que NI lui NI son partenaire
   * n'ont passé depuis l'annonce en cours (le contre n'est pas déjà posé).
   * Ex. A/C contre B : C (suivant) peut coincher ; A peut coincher si C n'a pas passé.
   */
  canContre(seat: Seat): boolean {
    if (this.phase !== 'bidding' || this.contre !== 'none' || !this.highestBid) return false;
    if (teamOf(this.highestBid.seat) === teamOf(seat)) return false; // pas son propre camp
    const passed = this.passedSinceHighest();
    return !passed.has(seat) && !passed.has(partnerOf(seat));
  }
  /** Seule l'équipe contrée peut surcoincher, et uniquement pendant la micro-phase surcontre. */
  canSurcontre(seat: Seat): boolean {
    return this.phase === 'surcontre' && !!this.surcontrePending?.has(seat);
  }

  /** Ouvre la phase surcontre : les deux sièges du camp preneur doivent décider (pass/surcontre). */
  private enterSurcontrePhase() {
    const takerTeam = teamOf(this.highestBid!.seat);
    const pending = ([0, 1, 2, 3] as Seat[]).filter((s) => teamOf(s) === takerTeam);
    this.surcontrePending = new Set(pending);
    this.phase = 'surcontre';
    this.turn = pending[0]; // hint pour les pilotes robots ; les humains voient la popup sur tous les sièges en attente
  }

  private advanceBidTurn() {
    this.turn = this.next(this.turn!);
  }

  private closeBidding() {
    const hb = this.highestBid!;
    this.trump = hb.suit!;
    this.bidderSeat = hb.seat;
    this.phase = 'playing';
    this.turn = this.next(this.dealer);
  }

  // ---- jeu -------------------------------------------------------------------

  legalCards(seat: Seat): Card[] {
    if (this.phase !== 'playing' || this.awaitingCollect || this.turn !== seat || !this.trump) return [];
    return this.rules.legalMoves({
      hand: this.hands[seat],
      trick: this.currentTrick,
      trump: this.trump,
      mySeat: seat,
      partnerSeat: partnerOf(seat),
    });
  }

  playCard(seat: Seat, card: Card): { ok: boolean; error?: string } {
    if (this.phase !== 'playing' || this.awaitingCollect) return { ok: false, error: 'phase' };
    if (this.turn !== seat) return { ok: false, error: 'turn' };
    const legal = this.legalCards(seat);
    if (!legal.some((c) => sameCard(c, card))) return { ok: false, error: 'illegal' };

    if (this.currentTrick.length === 0) this.currentTrickLeader = seat;
    this.hands[seat] = this.hands[seat].filter((c) => !sameCard(c, card));
    this.currentTrick.push({ seat, card });
    this.playedCards.push({ seat, card });
    this.op('play', { card }, seat);

    if (this.currentTrick.length < 4) {
      this.turn = this.next(seat);
      return { ok: true };
    }
    // Pli complet : on garde les 4 cartes visibles jusqu'à collectTrick().
    const winIdx = this.rules.trickWinnerIndex(this.currentTrick, this.trump!);
    this.pendingWinnerSeat = this.currentTrick[winIdx].seat;
    this.awaitingCollect = true;
    this.turn = this.pendingWinnerSeat;
    return { ok: true };
  }

  /** Ramasse le pli complet (appelé par le contrôleur après une pause d'affichage). */
  collectTrick(): void {
    if (!this.awaitingCollect || this.pendingWinnerSeat == null) return;
    const winnerSeat = this.pendingWinnerSeat;
    const team = teamOf(winnerSeat);
    const pts = this.currentTrick.reduce((s, e) => s + cardValue(e.card, this.trump!), 0);
    this.pointsThisDonne[team] += pts;
    this.tricksWon[team] += 1;
    this.lastTrickWinner = winnerSeat;
    this.op('trick', { winnerSeat, points: pts });
    this.lastTrick = { plays: [...this.currentTrick], leaderSeat: this.currentTrickLeader, winnerSeat };
    this.currentTrick = [];
    this.currentTrickLeader = null;
    this.awaitingCollect = false;
    this.pendingWinnerSeat = null;
    this.turn = winnerSeat;
    if (this.hands.every((h) => h.length === 0)) this.endDonne();
  }

  // ---- fin de donne / manche / partie ---------------------------------------

  /** Choix d'annonce de la belote par siège (true par défaut : robots et humains annoncent). */
  private beloteAnnounceFlags: boolean[] = [true, true, true, true];

  /** Siège détenant Roi + Dame d'atout dans sa main initiale (belote), sinon null. */
  beloteSeat(): Seat | null {
    if (!this.trump) return null;
    for (const seat of [0, 1, 2, 3] as Seat[]) {
      const h = this.currentDonneHands[seat];
      if (handContains(h, 'R', this.trump) && handContains(h, 'D', this.trump)) return seat;
    }
    return null;
  }

  /** Nombre de cartes de la belote (R/D d'atout) déjà jouées par son porteur. */
  private belotePlayedCount(seat: Seat): 0 | 1 | 2 {
    if (!this.trump) return 0;
    let n = 0;
    for (const p of this.playedCards) {
      if (p.seat === seat && p.card.suit === this.trump && (p.card.rank === 'R' || p.card.rank === 'D')) n++;
    }
    return Math.min(2, n) as 0 | 1 | 2;
  }

  /**
   * Active/désactive l'annonce de la belote pour un siège. Autorisé UNIQUEMENT
   * tant que le porteur n'a joué ni le Roi ni la Dame d'atout. Sans annonce,
   * les 20 points de belote ne sont PAS comptés.
   */
  setBeloteAnnounce(seat: Seat, on: boolean): { ok: boolean; error?: string } {
    if (this.beloteSeat() !== seat) return { ok: false, error: "Ce siège n'a pas la belote." };
    if (this.belotePlayedCount(seat) > 0) return { ok: false, error: 'Trop tard : la première carte de la belote est jouée.' };
    this.beloteAnnounceFlags[seat] = on;
    this.op('belote_announce', { seat, on });
    return { ok: true };
  }

  private beloteTeam(): Team | null {
    // Belote = le MÊME joueur détient Roi + Dame d'atout, les a jouées TOUTES LES DEUX,
    // et a choisi de l'ANNONCER (sinon les 20 points ne comptent pas).
    const seat = this.beloteSeat();
    if (seat == null) return null;
    if (!this.beloteAnnounceFlags[seat]) return null;
    if (this.belotePlayedCount(seat) < 2) return null;
    return teamOf(seat);
  }

  private endDonne() {
    const hb = this.highestBid!;
    const takerTeam = teamOf(hb.seat);
    const isCapot = this.tricksWon[takerTeam] === 8;
    const score = this.rules.scoreManche({
      takerTeam,
      contract: hb.value!,
      isCapot,
      capotDeclared: this.declaredCapot,
      trump: this.trump!,
      contre: this.contre,
      rawPoints: { ...this.pointsThisDonne },
      lastTrickTeam: teamOf(this.lastTrickWinner!),
      beloteTeam: this.beloteTeam(),
    });
    this.cumulative.A += score.A;
    this.cumulative.B += score.B;
    this.op('donne_score', { A: score.A, B: score.B, contractMet: score.contractMet });

    const rec: DonneRecord = {
      dealer: this.dealer,
      hands: this.currentDonneHands,
      trump: this.trump,
      bidderSeat: this.bidderSeat,
      contract: hb.value!,
      contre: this.contre,
      operations: this.donneOps,
      donneScore: { A: score.A, B: score.B },
    };
    const manche = this.manches[this.manches.length - 1];
    manche.donnes.push(rec);
    manche.cumulative = { ...this.cumulative };

    // course à l'objectif
    if (this.cumulative.A >= this.target || this.cumulative.B >= this.target) {
      this.endManche();
    } else {
      this.phase = 'donne_end';
    }
  }

  /** Le contrôleur appelle nextDonne() pour enchaîner après 'donne_end'. */
  nextDonne(): void {
    if (this.phase !== 'donne_end') return;
    this.startDonne(this.next(this.dealer));
  }

  private endManche() {
    const winner: Team = this.cumulative.A >= this.cumulative.B ? 'A' : 'B';
    const manche = this.manches[this.manches.length - 1];
    manche.winner = winner;
    this.manchesWon[winner] += 1;
    this.op('manche_end', { winner, cumulative: this.cumulative });
    this.resolvePartieOrNextManche();
  }

  /** Machine à états des manches + labels (selon la spec). */
  private resolvePartieOrNextManche() {
    const { A, B } = this.manchesWon;
    const cfg = this.config;

    const finish = (w: Team) => {
      this.partieWinner = w;
      this.phase = 'partie_end';
      this.op('partie_end', { winner: w, manchesWon: this.manchesWon });
    };

    if (cfg.manches === 1) {
      finish(A > B ? 'A' : 'B');
      return;
    }

    if (cfg.manches === 2) {
      if (A === 2 || B === 2) return finish(A === 2 ? 'A' : 'B');
      if (A === 1 && B === 1) {
        this.phase = 'manche_end';
        return this.startManche(cfg.labelTarget, true, 'grand');
      }
      this.phase = 'manche_end';
      return this.startManche(cfg.baseTarget, false);
    }

    // 4 manches
    if (this.labelKind === 'grand') return finish(A > B ? 'A' : 'B');
    if (this.labelKind === 'petit') {
      // résultat du petit label
      if (A === 4 || B === 4) return finish(A === 4 ? 'A' : 'B'); // 4 vs 1
      // 3 vs 2 -> grand label 2000
      this.phase = 'manche_end';
      return this.startManche(cfg.labelTarget, true, 'grand');
    }

    const total = A + B;
    if (total < 4) {
      this.phase = 'manche_end';
      return this.startManche(cfg.baseTarget, false);
    }
    // 4 manches jouées
    if (A === 4 || B === 4) return finish(A === 4 ? 'A' : 'B');
    if (A === 2 && B === 2) {
      this.phase = 'manche_end';
      return this.startManche(cfg.labelTarget, true, 'grand');
    }
    // 3 vs 1 -> petit label 1500
    this.phase = 'manche_end';
    return this.startManche(cfg.baseTarget, true, 'petit');
  }

  /** Le contrôleur appelle nextManche() après 'manche_end'. */
  nextManche(): void {
    if (this.phase !== 'manche_end') return;
    this.startDonne(this.next(this.dealer));
  }

  // ---- export rejeu ----------------------------------------------------------

  /** Récapitulatif structuré des scores (pli/donne/manche/partie) — lecture seule. */
  summary(): import('./types').ScoreSummary {
    return {
      manches: this.manches.map((m) => ({
        index: m.index,
        target: m.target,
        isLabel: m.isLabel,
        labelKind: m.labelKind,
        winner: m.winner,
        cumulative: m.cumulative,
        donnes: m.donnes.map((d, i) => ({
          index: i + 1,
          dealer: d.dealer,
          bidderSeat: d.bidderSeat,
          bidderTeam: d.bidderSeat != null ? teamOf(d.bidderSeat) : null,
          trump: d.trump,
          contract: d.contract,
          contre: d.contre,
          score: d.donneScore ?? { A: 0, B: 0 },
        })),
      })),
      manchesWon: this.manchesWon,
      winner: this.partieWinner,
    };
  }

  toReplay(): ReplayRecord {
    return {
      config: this.config,
      players: this.players,
      manches: this.manches,
      manchesWon: this.manchesWon,
      winner: this.partieWinner,
      startedAt: this.startedAt,
      endedAt: this.phase === 'partie_end' ? Date.now() : undefined,
    };
  }
}
