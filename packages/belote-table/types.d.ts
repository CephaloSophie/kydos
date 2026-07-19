/**
 * Déclarations publiques de @kanto-aplo/belote-table.
 * Auto-suffisantes : les types du moteur (Bid, Card, Seat…) sont décrits de façon
 * structurelle pour ne pas exiger belote-core côté consommateur.
 */
import type { ComponentType } from 'react';

export type Suit = 'pique' | 'coeur' | 'carreau' | 'trefle';
export interface Card { rank: string; suit: Suit }
export interface Bid {
  seat: number;
  action: 'pass' | 'bid' | 'capot' | 'contree' | 'surcontree';
  value?: number;
  suit?: Suit;
  saidSuit?: boolean;
  reflexion?: boolean;
  repeatPartnerSuit?: boolean;
  reason?: string;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export interface BeloteGameState {
  view: any;
  summary: any;
  myHand?: Card[];
  legal?: Card[];
  mySeat?: number | null;
  hands?: (Card[] | null)[];
  watcher?: boolean;
}

export interface BeloteTableSnapshot {
  id: string;
  ownerType?: string;
  visibility?: string;
  status?: 'lobby' | 'playing' | 'finished' | string;
  seats: Array<{ index: number; team?: 'A' | 'B'; kind: string; name?: string }>;
  config?: { manches?: number; [k: string]: unknown };
  [k: string]: unknown;
}

export type BeloteTableEvent =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'table'; table: BeloteTableSnapshot }
  | { type: 'tablesChanged' }
  | { type: 'state'; state: BeloteGameState }
  | { type: 'finished'; winner?: string }
  | { type: 'error'; error: string };

export interface BeloteTableContext {
  status: ConnectionStatus;
  tableId: string | null;
  table: BeloteTableSnapshot | null;
  state: BeloteGameState | null;
  finished: { winner?: string } | null;
}

export interface BeloteTableClientConfig {
  socketUrl: string;
  apiUrl?: string;
  token?: string;
  tableId?: string;
  transports?: Array<'websocket' | 'polling'>;
  logLimit?: number;
}

export type BeloteTableAction =
  | { kind: 'bid'; bid: Omit<Bid, 'seat'> }
  | { kind: 'play'; card: Card };

/** Contrôleur autonome : socket + REST + contexte + évènements + logs + actions. */
export class BeloteTableClient {
  constructor(config: BeloteTableClientConfig);
  connect(): void;
  disconnect(): void;
  subscribe(tableId: string): void;
  unsubscribe(): void;
  bid(bid: Omit<Bid, 'seat'>): void;
  play(card: Card): void;
  getContext(): BeloteTableContext;
  getLogs(): BeloteTableEvent[];
  on(listener: (event: BeloteTableEvent) => void): () => void;
  raw(): unknown;
}

export interface TableVisualConfig {
  feltTheme?: string;
  showScoreSheet?: boolean;
  atoutCorners?: boolean;
  notifyMs?: number;
  annonceDelayMs?: number;
  [k: string]: unknown;
}

export interface BeloteTableProps {
  config: BeloteTableClientConfig;
  client?: BeloteTableClient;
  visual?: TableVisualConfig;
  baseWidth?: number;
  baseHeight?: number;
  fullscreen?: boolean;
}
/** Vue complète, connectée et responsive. */
export const BeloteTable: ComponentType<BeloteTableProps>;
export function useBeloteTable(config: BeloteTableClientConfig, existing?: BeloteTableClient): { client: BeloteTableClient; context: BeloteTableContext };

export interface StandaloneBeloteTableProps {
  context?: unknown;
  visual?: TableVisualConfig;
  baseWidth?: number;
  baseHeight?: number;
  fullscreen?: boolean;
  onLog?: (entry: unknown) => void;
}
/** Table jouable sans backend (pilotée localement) — test/démo. */
export const StandaloneBeloteTable: ComponentType<StandaloneBeloteTableProps>;

export interface TableStageProps {
  children: any;
  baseWidth?: number;
  baseHeight?: number;
  fullscreenButton?: boolean;
  maxScale?: number;
}
/** Conteneur responsive : met la table à l'échelle + plein écran. */
export const TableStage: ComponentType<TableStageProps>;

export interface MountHandle { unmount: () => void }
/** Monte la table connectée dans un élément DOM (une ligne). */
export function mountBeloteTable(element: HTMLElement, props: BeloteTableProps): MountHandle;
/** Monte la table autonome (sans backend) dans un élément DOM. */
export function mountStandaloneBeloteTable(element: HTMLElement, props?: StandaloneBeloteTableProps): MountHandle;

export const GameTable: ComponentType<any>;
export const TableSurface: ComponentType<any>;
export const ScoreView: ComponentType<any>;
export const DevDock: ComponentType<any>;
