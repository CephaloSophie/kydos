import type { Bid, Card } from 'belote-core';

/** État de jeu reçu du serveur (vue moteur + main + cartes légales + résumé). */
export interface BeloteGameState {
  view: any;
  summary: any;
  myHand?: Card[];
  legal?: Card[];
  mySeat?: number | null;
  hands?: (Card[] | null)[];
  watcher?: boolean;
}

/** Instantané d'une table (lobby + sièges + statut). */
export interface BeloteTableSnapshot {
  id: string;
  ownerType?: string;
  visibility?: string;
  status?: 'lobby' | 'playing' | 'finished' | string;
  seats: Array<{ index: number; team?: 'A' | 'B'; kind: string; name?: string }>;
  config?: { manches?: number; [k: string]: unknown };
  [k: string]: unknown;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

/** Évènements émis par le client (flux observable). */
export type BeloteTableEvent =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'table'; table: BeloteTableSnapshot }
  | { type: 'tablesChanged' }
  | { type: 'state'; state: BeloteGameState }
  | { type: 'finished'; winner?: string }
  | { type: 'error'; error: string };

/** Contexte courant consultable à tout moment via client.getContext(). */
export interface BeloteTableContext {
  status: ConnectionStatus;
  tableId: string | null;
  table: BeloteTableSnapshot | null;
  state: BeloteGameState | null;
  finished: { winner?: string } | null;
}

/** Configuration d'initialisation : il suffit de l'URL socket + un token. */
export interface BeloteTableClientConfig {
  /** URL du serveur Socket.IO (ex. https://ville-1.exemple.com). */
  socketUrl: string;
  /** URL de base de l'API REST (défaut: `${socketUrl}`). Le suffixe /api est ajouté côté serveur. */
  apiUrl?: string;
  /** Jeton d'authentification (Bearer + auth socket). */
  token?: string;
  /** Table à rejoindre automatiquement à la connexion. */
  tableId?: string;
  /** Transports Socket.IO (défaut ['websocket','polling']). */
  transports?: Array<'websocket' | 'polling'>;
  /** Taille max du journal d'évènements conservé en mémoire (défaut 200). */
  logLimit?: number;
}

/** Action de jeu envoyée au serveur. */
export type BeloteTableAction =
  | { kind: 'bid'; bid: Omit<Bid, 'seat'> }
  | { kind: 'play'; card: Card };
