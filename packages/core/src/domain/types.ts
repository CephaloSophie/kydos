// ============================================================================
//  Types partagés — enchères, contexte de table, personnalité, enregistrement
// ============================================================================

import type { Card, Suit } from './cards';

export type Team = 'A' | 'B';
export type Seat = 0 | 1 | 2 | 3; // 0 & 2 = équipe A ; 1 & 3 = équipe B

export type ContreLevel = 'none' | 'contree' | 'surcontree';

/** Une enchère telle qu'elle a été déposée à la table. */
export interface Bid {
  seat: Seat;
  action: 'pass' | 'bid' | 'capot' | 'contree' | 'surcontree';
  /** Valeur du contrat (90..180). Absent pour pass / contre. */
  value?: number;
  /** Couleur annoncée. Absente quand le robot dit « 100 tout court ». */
  suit?: Suit;
  /** True si la couleur est explicitement nommée (signal de longueur d'atout). */
  saidSuit?: boolean;
  /**
   * SIGNAL « réflexion » : le joueur a réfléchi AVANT de monter l'enchère.
   * Valide uniquement attaché à une annonce qui augmente la mise (jamais sur un pass).
   */
  reflexion?: boolean;
  /**
   * SIGNAL « répéter la couleur du coéquipier » : le joueur monte la mise en reprenant
   * volontairement la couleur de son partenaire, sans la nommer (non affichée).
   * Valide uniquement si le partenaire a déjà annoncé une couleur et si la mise augmente.
   */
  repeatPartnerSuit?: boolean;
  reason?: string;
}

/**
 * En-tête de contexte fourni à TOUT robot (jamais aux humains).
 * Objet volontairement extensible : on ajoute des champs sans casser l'existant.
 */
export interface TableContext {
  /** Phase courante. */
  phase: 'bidding' | 'play';
  /** Atout retenu une fois les enchères terminées (sinon couleur candidate). */
  trump: Suit | null;
  /** Siège du demandeur courant (preneur provisoire). */
  bidderSeat: Seat | null;
  /** Historique complet des enchères, dans l'ordre. */
  bids: Bid[];
  /** Annonce courante la plus haute. */
  currentBid: Bid | null;
  /** Niveau de contre en cours. */
  contre: ContreLevel;
  /** Cartes déjà jouées (tous plis confondus), dans l'ordre. */
  playedCards: { seat: Seat; card: Card }[];
  /** Pli en cours, dans l'ordre de jeu. */
  currentTrick: { seat: Seat; card: Card }[];
  /** Nombre d'atouts pas encore joués (vue globale). */
  trumpsRemaining: number;
  /** Liste des atouts pas encore vus en jeu (déduits). */
  trumpsUnseen: Card[];
  /** Extensible : conventions de table, météo de la partie, etc. */
  [k: string]: unknown;
}

/** Traits de personnalité d'un robot (0..10). */
export interface Personality {
  /** Agressivité — influence le choix carte forte vs réserve. */
  aggressiveness: number;
  /** Concentration — influence le taux d'erreur / la qualité d'analyse. */
  concentration: number;
  /** Vélocité — mappée sur le temps de réponse. */
  velocity: number;
}

export interface RobotConfig {
  id: string;
  name: string;
  personality: Personality;
  /** Temps de réflexion de base en ms (défaut 1000). */
  responseTimeMs: number;
  /** Temps max de jeu avant coup forcé (défaut 10000). */
  maxPlayTimeMs: number;
  /** Algorithme du robot sous forme de JSON (le robot pointe vers une AlgoSpec). */
  algoSpec?: import('../robot/AlgoSpec').AlgoSpec;
}

export const DEFAULT_ROBOT: Omit<RobotConfig, 'id' | 'name'> = {
  personality: { aggressiveness: 5, concentration: 5, velocity: 5 },
  responseTimeMs: 1000,
  maxPlayTimeMs: 10000,
};

/** Décision de jeu renvoyée par le cerveau d'un robot. */
export interface BidDecision {
  action: 'pass' | 'bid' | 'contree' | 'surcontree';
  value?: number;
  suit?: Suit;
  saySuit?: boolean;
  /** Multiplicateur de temps de réflexion (ex. 2 = « il réfléchit deux fois »). */
  thinkMultiplier: number;
  reason: string;
}

export interface CardDecision {
  card: Card;
  thinkMultiplier: number;
  reason: string;
}
