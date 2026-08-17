// ============================================================================
//  Types du moteur de partie (orchestration donnes -> manches -> partie/labels)
// ============================================================================

import type { Card, Suit } from '../domain/cards';
import type { Bid, ContreLevel, Personality, Seat } from '../domain/types';

export interface EnginePlayer {
  seat: Seat;
  name: string;
  type: 'human' | 'robot';
  userId?: string;
  /** Présent si robot : sert au contrôleur pour instancier le cerveau. */
  robotId?: string;
  personality?: Personality;
}

export interface PartieConfig {
  /** 1, 2 ou 4 manches. */
  manches: 1 | 2 | 4;
  /**
   * Objectif de manche standard (défaut 1500). v16 — configurable par table /
   * tournoi (le back-office peut fixer un score cible personnalisé).
   */
  baseTarget: number;
  /** Objectif du label (défaut 2000). v16 — configurable. */
  labelTarget: number;
  responseTimeMs: number;
  maxPlayTimeMs: number;
  /** Sens du jeu : false = antihoraire (défaut), true = horaire. Fixe pour la partie. */
  clockwise: boolean;
  /** Partie locale d'entraînement : pas de points récompense, toutes cartes visibles. */
  local: boolean;
  /**
   * Signaux d'enchère ACTIVÉS à cette table (initialisés à la création de la table).
   * Permettent de configurer plus tard ces indices dans les algos des robots.
   */
  signals?: {
    /** Autoriser le signal « réflexion » attaché à une montée d'enchère. */
    reflexion: boolean;
    /** Autoriser le signal « répéter la couleur du coéquipier » (sans la nommer). */
    repeatSuit: boolean;
  };
}

export const DEFAULT_PARTIE: PartieConfig = {
  manches: 2,
  baseTarget: 1500,
  labelTarget: 2000,
  responseTimeMs: 1000,
  maxPlayTimeMs: 10000,
  clockwise: false,
  local: true,
  signals: { reflexion: true, repeatSuit: true },
};

export type EnginePhase =
  | 'bidding'
  | 'surcontre'
  | 'playing'
  | 'donne_end'
  | 'manche_end'
  | 'partie_end';

/** Opération atomique enregistrée pour le rejeu. */
export interface Operation {
  type: 'deal' | 'bid' | 'play' | 'trick' | 'donne_score' | 'manche_end' | 'partie_end' | 'belote_announce';
  seat?: Seat;
  at: number;
  data: Record<string, unknown>;
}

export interface DonneRecord {
  dealer: Seat;
  hands: Card[][]; // mains initiales (rejeu exact)
  trump: Suit | null;
  bidderSeat: Seat | null;
  contract: number | null;
  contre: ContreLevel;
  operations: Operation[];
  donneScore?: { A: number; B: number };
}

export interface MancheRecord {
  index: number;
  target: number;
  isLabel: boolean;
  labelKind?: 'petit' | 'grand';
  donnes: DonneRecord[];
  cumulative: { A: number; B: number };
  winner?: 'A' | 'B';
}

export interface ReplayRecord {
  config: PartieConfig;
  players: EnginePlayer[];
  manches: MancheRecord[];
  manchesWon: { A: number; B: number };
  winner?: 'A' | 'B';
  startedAt: number;
  endedAt?: number;
}

/** Pli (en cours ou précédent) avec entameur et preneur. */
export interface TrickView {
  plays: { seat: Seat; card: Card }[];
  leaderSeat: Seat | null;
  winnerSeat: Seat | null;
}

/** Tableau de bord « live » d'une donne (lecture seule). */
export interface ScoreBoard {
  /** Points cartes BRUTS encaissés par équipe dans la donne en cours (total → 162). */
  donneRaw: { A: number; B: number };
  /** Plis gagnés dans la donne en cours. */
  tricks: { A: number; B: number };
  /** Équipe du demandeur (preneur du contrat) — null avant la fin des enchères. */
  bidderTeam: 'A' | 'B' | null;
}

export interface DonneSummary {
  index: number;
  dealer: Seat;
  bidderSeat: Seat | null;
  bidderTeam: 'A' | 'B' | null;
  trump: Suit | null;
  contract: number | null;
  contre: ContreLevel;
  score: { A: number; B: number };
}
export interface MancheSummary {
  index: number;
  target: number;
  isLabel: boolean;
  labelKind?: 'petit' | 'grand';
  winner?: 'A' | 'B';
  cumulative: { A: number; B: number };
  donnes: DonneSummary[];
}
export interface ScoreSummary {
  manches: MancheSummary[];
  manchesWon: { A: number; B: number };
  winner?: 'A' | 'B';
}

/** Vue exposée par le moteur pour piloter l'UI / le contrôleur. */
export interface EngineView {
  phase: EnginePhase;
  turn: Seat | null;
  trump: Suit | null;
  bidderSeat: Seat | null;
  /** Donneur de la donne en cours (siège). */
  dealer: Seat;
  /** Premier annonceur de la donne (juste après le donneur, sens de jeu pris en compte). */
  firstBidderSeat: Seat;
  currentBidValue: number | null;
  contre: ContreLevel;
  /** Sièges autorisés à coincher / surcoincher maintenant (sens de jeu pris en compte). */
  contreSeats: Seat[];
  surcontreSeats: Seat[];
  /** Enchères de la donne courante (pour afficher la demande de chaque joueur). */
  bids: Bid[];
  currentTrick: { seat: Seat; card: Card }[];
  /** Siège ayant entamé le pli courant. */
  currentTrickLeader: Seat | null;
  /** Pli complet en attente de ramassage (les 4 cartes restent visibles). */
  awaitingCollect: boolean;
  /** Preneur du pli en attente de ramassage (sinon null). */
  pendingWinnerSeat: Seat | null;
  /** Dernier pli déjà ramassé (panneau « pli précédent »). */
  lastTrick: TrickView | null;
  manchesWon: { A: number; B: number };
  cumulative: { A: number; B: number };
  /** Belote de la donne : porteur de R+D d'atout, son choix d'annonce, cartes jouées (0/1/2). */
  belote: { seat: Seat; announcing: boolean; playedCount: 0 | 1 | 2 } | null;
  /** Tableau de bord live de la donne en cours. */
  board: ScoreBoard;
  target: number;
  mancheIndex: number;
  isLabel: boolean;
  labelKind?: 'petit' | 'grand';
  /** Sens du jeu (pour l'indicateur de flux côté UI). */
  clockwise: boolean;
}
