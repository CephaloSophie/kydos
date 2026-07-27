import { io, type Socket } from 'socket.io-client';
import type { Bid, Card } from 'belote-core';
import type {
  BeloteGameState,
  BeloteTableClientConfig,
  BeloteTableContext,
  BeloteTableEvent,
  BeloteTableSnapshot,
  ConnectionStatus,
} from './types';

type Listener = (event: BeloteTableEvent) => void;

/**
 * BeloteTableClient — CONTRÔLEUR autonome (MVC) de la table de jeu.
 *
 * Encapsule toute la plomberie réseau (Socket.IO + REST) derrière une interface
 * propre, indépendante de tout framework UI : on l'instancie avec `{ socketUrl, token }`,
 * on s'abonne à une table, on lit le CONTEXTE (`getContext`), on écoute le FLUX d'évènements
 * (`on`), on consulte les LOGS (`getLogs`) et on envoie des ACTIONS (`bid`, `play`).
 *
 * Aucune dépendance à `window`, `localStorage` ou `import.meta` : réutilisable tel quel
 * dans une autre application web, dans une WebView, ou dans un test.
 */
export class BeloteTableClient {
  private socket: Socket | null = null;
  private readonly config: Required<Pick<BeloteTableClientConfig, 'socketUrl' | 'transports' | 'logLimit'>> & BeloteTableClientConfig;
  private listeners = new Set<Listener>();
  private logs: BeloteTableEvent[] = [];

  private context: BeloteTableContext = {
    status: 'idle',
    tableId: null,
    table: null,
    state: null,
    finished: null,
  };

  constructor(config: BeloteTableClientConfig) {
    this.config = {
      transports: ['websocket', 'polling'],
      logLimit: 200,
      ...config,
    };
    this.context.tableId = config.tableId ?? null;
  }

  // ---- Cycle de vie ----------------------------------------------------------

  /** Ouvre la connexion Socket.IO et rejoint la table si `tableId` est fourni. */
  connect(): void {
    if (this.socket) return;
    this.setStatus('connecting');
    this.socket = io(this.config.socketUrl, {
      auth: this.config.token ? { token: this.config.token } : {},
      transports: this.config.transports,
    });

    this.socket.on('connect', () => {
      this.setStatus('connected');
      if (this.context.tableId) this.socket!.emit('table:subscribe', this.context.tableId);
    });
    this.socket.on('disconnect', () => this.setStatus('disconnected'));
    this.socket.on('connect_error', (error: Error) => this.emit({ type: 'error', error: error.message }));

    this.socket.on('tables:changed', () => this.emit({ type: 'tablesChanged' }));
    this.socket.on('table:update', (table: BeloteTableSnapshot) => {
      this.context = { ...this.context, table };
      this.emit({ type: 'table', table });
    });
    this.socket.on('table:game', (state: BeloteGameState) => {
      this.context = { ...this.context, state, finished: null };
      this.emit({ type: 'state', state });
    });
    this.socket.on('table:finished', (result: { winner?: string }) => {
      this.context = { ...this.context, finished: result };
      this.emit({ type: 'finished', winner: result?.winner });
    });
  }

  /** Ferme la connexion et réinitialise le contexte. */
  disconnect(): void {
    if (this.context.tableId) this.socket?.emit('table:unsubscribe', this.context.tableId);
    this.socket?.disconnect();
    this.socket = null;
    this.context = { status: 'disconnected', tableId: null, table: null, state: null, finished: null };
    this.setStatus('disconnected');
  }

  // ---- Abonnement à une table ------------------------------------------------

  subscribe(tableId: string): void {
    this.context = { ...this.context, tableId };
    this.socket?.emit('table:subscribe', tableId);
  }

  unsubscribe(): void {
    if (this.context.tableId) this.socket?.emit('table:unsubscribe', this.context.tableId);
    this.context = { ...this.context, tableId: null, table: null, state: null, finished: null };
  }

  // ---- Actions de jeu --------------------------------------------------------

  /** Envoie une demande (annonce, contre, surcontre, capot, passe). */
  bid(bid: Omit<Bid, 'seat'>): void {
    if (!this.context.tableId) return;
    this.socket?.emit('table:bid', { tableId: this.context.tableId, bid });
  }

  /** Joue une carte. */
  play(card: Card): void {
    if (!this.context.tableId) return;
    this.socket?.emit('table:play', { tableId: this.context.tableId, card });
  }

  // ---- Lecture du contexte / logs / flux -------------------------------------

  /** Instantané du contexte courant (statut, table, état de jeu, résultat). */
  getContext(): BeloteTableContext {
    return this.context;
  }

  /** Journal des évènements reçus (le plus récent en dernier). */
  getLogs(): BeloteTableEvent[] {
    return this.logs;
  }

  /** S'abonne au flux d'évènements ; retourne une fonction de désabonnement. */
  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Accès bas-niveau au socket (rare ; pour étendre proprement sans casser l'encapsulation). */
  raw(): Socket | null {
    return this.socket;
  }

  // ---- Interne ---------------------------------------------------------------

  private setStatus(status: ConnectionStatus): void {
    this.context = { ...this.context, status };
    this.emit({ type: 'status', status });
  }

  private emit(event: BeloteTableEvent): void {
    this.logs.push(event);
    if (this.logs.length > this.config.logLimit) this.logs.shift();
    for (const listener of this.listeners) listener(event);
  }
}
