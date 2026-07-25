/* =============================================================================
 * DATA · TableSocket.ts — Client temps réel du jeu en ligne (Socket.IO).
 * -----------------------------------------------------------------------------
 * Pièce qui manquait : le mobile n'avait AUCUN client socket. Le serveur, lui,
 * fait TOUT (moteur, robots qui jouent côté serveur, substitution au départ
 * d'un joueur, reprise au retour, diffusion filtrée sans les mains adverses).
 * Ce client se contente de :
 *   • s'abonner à une table (`table:subscribe`) ;
 *   • recevoir l'état du lobby en direct (`table:lobby`) → sièges à jour ;
 *   • recevoir l'état de la partie (`table:game`) → alimente la table Pixi ;
 *   • émettre les actions du joueur (`table:bid`, `table:play`, `table:signal`).
 *
 * Le mobile ne calcule JAMAIS le jeu : il l'affiche et transmet les gestes.
 * ========================================================================== */
import { io, type Socket } from 'socket.io-client';
import type { Bid, Card, EngineView, Seat } from 'belote-core';
import { api } from './ApiClient';

/** Origine du serveur socket, dérivée de l'URL d'API (on retire le suffixe /api). */
function socketOrigin(): string {
  const base = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || 'http://localhost:4000/api';
  return base.replace(/\/api\/?$/, '');
}

/** État de partie reçu du serveur (mêmes champs que broadcastState). */
export interface LiveGameState {
  view: EngineView;
  summary: unknown;
  mySeat?: Seat;
  myHand?: Card[];
  legal?: Card[];
  watcher?: boolean;
  logs?: { t: number; msg: string }[];
}

/** État du lobby reçu du serveur (table sérialisée). */
export interface LiveLobbyState {
  id: string;
  status: 'lobby' | 'playing' | 'finished' | 'draft';
  kind: 'hybride' | 'acier' | 'royal';
  seats: { index: number; kind: string; name: string; team: 'A' | 'B'; userId: string | null; robotId: string | null; ownerId: string | null }[];
  owner: string;
  visibility: 'public' | 'private';
}

export interface TableSocketHandlers {
  onLobby?: (lobby: LiveLobbyState) => void;
  onGame?: (state: LiveGameState) => void;
  onSpectatorFull?: (info: { max: number }) => void;
  onCountdown?: (info: { tableId: string; startsInMs: number }) => void;
  onSpectators?: (count: number) => void;
  onFinished?: (info: { winner: 'A' | 'B' | null; gameId?: string }) => void;
  onSignal?: (info: { seat: Seat; kind: string; data: unknown }) => void;
  onConnectError?: (message: string) => void;
}

/**
 * Enveloppe la connexion à UNE table. Idempotente : `subscribe` peut être
 * appelé plusieurs fois, la souscription serveur reste unique par table.
 */
export class TableSocket {
  #socket: Socket | null = null;
  #tableId: string | null = null;
  #handlers: TableSocketHandlers = {};

  /** Ouvre la connexion authentifiée et s'abonne à la table. */
  connect(tableId: string, handlers: TableSocketHandlers): void {
    this.#handlers = handlers;
    this.#tableId = tableId;

    const socket = io(socketOrigin(), {
      transports: ['websocket'],
      auth: { token: api.token() ?? '' },
      reconnection: true,
      reconnectionDelay: 800,
    });
    this.#socket = socket;

    socket.on('connect', () => socket.emit('table:subscribe', tableId));
    socket.on('connect_error', (err: Error) => this.#handlers.onConnectError?.(err.message));

    socket.on('table:update', (lobby: LiveLobbyState) => this.#handlers.onLobby?.(lobby));
    socket.on('table:game', (state: LiveGameState) => this.#handlers.onGame?.(state));
    socket.on('table:spectator:full', (info: { max: number }) => this.#handlers.onSpectatorFull?.(info));
    socket.on('table:countdown', (info: { tableId: string; startsInMs: number }) => this.#handlers.onCountdown?.(info));
    socket.on('table:spectators', (info: { count: number }) => this.#handlers.onSpectators?.(info.count));
    socket.on('table:finished', (info: { winner: 'A' | 'B' | null; gameId?: string }) => this.#handlers.onFinished?.(info));
    socket.on('table:signal', (info: { seat: Seat; kind: string; data: unknown }) => this.#handlers.onSignal?.(info));
  }

  /** Émet une enchère du joueur. */
  submitBid(bid: Omit<Bid, 'seat'>): void {
    if (this.#socket && this.#tableId) this.#socket.emit('table:bid', { tableId: this.#tableId, bid });
  }

  /** Émet une carte jouée par le joueur. */
  playCard(card: Card): void {
    if (this.#socket && this.#tableId) this.#socket.emit('table:play', { tableId: this.#tableId, card });
  }

  /** Émet un signal (smiley, réflexion). */
  signal(kind: string, data: unknown): void {
    if (this.#socket && this.#tableId) this.#socket.emit('table:signal', { tableId: this.#tableId, kind, data });
  }

  /** Se désabonne et ferme proprement. */
  disconnect(): void {
    if (this.#socket && this.#tableId) this.#socket.emit('table:unsubscribe', this.#tableId);
    this.#socket?.disconnect();
    this.#socket = null;
    this.#tableId = null;
  }

  get connected(): boolean { return !!this.#socket?.connected; }
}
