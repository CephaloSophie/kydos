/* =============================================================================
 * DATA · ApiClient.ts — Client HTTP du VRAI backend Kýdos Belote.
 * -----------------------------------------------------------------------------
 * Couche « data » : seule à connaître les URL et la sérialisation réseau.
 * Base configurable via VITE_API_URL (défaut : http://localhost:4000/api).
 * Le jeton d'authentification est conservé en localStorage et injecté en
 * en-tête Authorization sur chaque appel protégé.
 * Endpoints consommés : /auth/*, /robots, /games, /analytics/me.
 * ========================================================================== */

const BASE: string = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'kydos.mobile.token';

/** URL de base de l'API (exposée pour diagnostic / écran de réglages). */
export const API_BASE_URL = BASE;

export interface AuthResult { token: string; user: { id: string; username: string; email?: string | null } }

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'ApiError'; }
}

export class ApiClient {
  token(): string | null { return localStorage.getItem(TOKEN_KEY); }
  setToken(t: string | null): void { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }
  isAuthenticated(): boolean { return !!this.token(); }

  /** Requêtes GET en cours — clé = path. Évite les doublons quand deux
   *  parties de l'app (TopBar + un écran) demandent la même donnée en même temps.
   *  Uniquement pour les méthodes idempotentes (GET) — jamais pour POST/PATCH/DELETE. */
  #inflight = new Map<string, Promise<unknown>>();

  async call<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    // Déduplication : uniquement pour les GET (méthode par défaut si non spécifiée).
    const method = (init.method ?? 'GET').toUpperCase();
    const canDedup = method === 'GET';
    if (canDedup) {
      const existing = this.#inflight.get(path);
      if (existing) return existing as Promise<T>;
    }

    const run = async (): Promise<T> => {
      let res: Response;
      try {
        res = await fetch(`${BASE}${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...(this.token() ? { Authorization: `Bearer ${this.token()}` } : {}),
            ...(init.headers ?? {}),
          },
        });
      } catch {
        // On expose l'URL RÉELLEMENT contactée : indispensable pour diagnostiquer
        // sur un device (localhost pointe le téléphone, pas la machine de dev).
        const host = BASE.replace(/^https?:\/\//, '').split('/')[0];
        const hint = /localhost|127\.0\.0\.1/.test(BASE)
          ? ` L'app pointe vers « ${host} » : sur un téléphone, localhost désigne le téléphone. Configurez VITE_API_URL avec l'IP de votre machine (ex. http://192.168.1.42:4000/api).`
          : ` L'app pointe vers « ${host} ». Vérifiez que le serveur est lancé, accessible sur le réseau, et que le téléphone est sur le même Wi-Fi.`;
        throw new ApiError(`Serveur injoignable.${hint}`, 0);
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Session expirée / jeton invalide : on purge et on ramène au login,
        // sinon l'app reste « connectée » avec toutes ses requêtes en erreur.
        if (res.status === 401) {
          this.setToken(null);
          if (typeof location !== 'undefined' && !location.hash.startsWith('#/login')) location.hash = '#/login';
        }
        throw new ApiError((body as { error?: string; message?: string })?.error || (body as { message?: string })?.message || `HTTP ${res.status}`, res.status);
      }
      return body as T;
    };

    if (canDedup) {
      const p = run().finally(() => { this.#inflight.delete(path); });
      this.#inflight.set(path, p);
      return p;
    }
    return run();
  }

  // --- Auth ---------------------------------------------------------------
  login(username: string, password: string) { return this.call<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); }
  register(username: string, password: string) { return this.call<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }); }
  me() { return this.call<{ user: AuthResult['user'] }>('/auth/me'); }

  // --- Robots -------------------------------------------------------------
  listRobots() { return this.call<{ robots: ServerRobot[] }>('/robots'); }
  createRobot(body: unknown) { return this.call<{ robot: { id: string; name: string } }>('/robots', { method: 'POST', body: JSON.stringify(body) }); }
  updateRobot(id: string, body: unknown) { return this.call<{ robot: { id: string; name: string } }>(`/robots/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }
  deleteRobot(id: string) { return this.call<{ ok: boolean }>(`/robots/${id}`, { method: 'DELETE' }); }

  // --- Matchmaking (v14) --------------------------------------------------
  /** Inscrit le joueur en file. v16 — `variantId` (variante précise) prioritaire ; `format` en repli. */
  enqueueMatch(format: string, robotIds: string[] = [], variantId?: string) {
    return this.call<{ status: 'queued' | 'matched'; matchId?: string; queuePosition?: number }>('/matches/enqueue', {
      method: 'POST', body: JSON.stringify({ format, variantId, robotIds }),
    });
  }
  /** Annule l'inscription en file (remboursement). v16 — par variante si fournie. */
  cancelMatchQueue(format: string, variantId?: string) {
    return this.call<{ refunded: number }>('/matches/cancel', { method: 'POST', body: JSON.stringify({ format, variantId }) });
  }
  /** Tailles de chaque file (Duo d'acier, Alliance hybride, Carrée royale). */
  matchQueues() { return this.call<{ sizes: Record<string, number> }>('/matches/queues'); }
  /** v16 — Liste dynamique des MATCH RAPIDE (config back-office). */
  listMatchFormats() {
    return this.call<{ formats: Array<{ format: string; label: string; subtitle: string; buyIn: number; prize: number; manches: number; baseTarget: number; color: string; icon: string; order: number; minLevel?: number; maxLevel?: number | null }> }>('/matches/formats');
  }
  /** Match courant ou plus récent du joueur (pour polling après matching). */
  getMyMatch() { return this.call<{ match: unknown | null }>('/matches/mine'); }
  /** Détail complet d'un match (participants avec robots populés). */
  getMatch(id: string) { return this.call<{ match: unknown }>(`/matches/${id}`); }
  /** Récupère (ou crée) la Table éphémère associée à un match non-headless. */
  provisionMatchLiveTable(id: string) {
    return this.call<{ tableId: string }>(`/matches/${id}/live-table`, { method: 'POST' });
  }

  // --- Tournaments (v14.1) ------------------------------------------------
  /** Liste les tournois visibles (filtrable par statut : upcoming, live, finished). */
  listTournaments(status?: 'upcoming' | 'live' | 'finished' | 'all') {
    const s = status && status !== 'all' ? `?status=${status}` : '';
    return this.call<{ tournaments: unknown[] }>(`/tournaments${s}`);
  }
  /** Détail complet d'un tournoi. */
  getTournament(id: string) { return this.call<{ tournament: unknown }>(`/tournaments/${id}`); }
  /** v16 — Statut ACTIF du joueur dans un tournoi live (écran d'attente / rejoindre). */
  getMyTournament() { return this.call<{ active: TournamentActive | null }>('/tournaments/mine'); }
  /** Inscription au tournoi (débit du buy-in, verrous 1/robot/jour). */
  joinTournament(id: string, robotIds: string[] = []) {
    return this.call<{ joined: true }>(`/tournaments/${id}/join`, { method: 'POST', body: JSON.stringify({ robotIds }) });
  }
  /** Désinscription (autorisée seulement en UPCOMING, remboursement complet). */
  leaveTournament(id: string) {
    return this.call<{ refunded: number }>(`/tournaments/${id}/leave`, { method: 'POST' });
  }

  /* --- v14.13 — Bracket & création --------------------------------------- */

  /** Arbre bracket persistant pour vue « coupe du monde ». Erreur si UPCOMING. */
  getTournamentBracket(id: string) {
    return this.call<{
      tournamentId: string;
      name: string;
      format: string;
      capacity: number;
      status: string;
      color: string;
      icon: string;
      bracket: {
        rounds: Array<{
          roundIndex: number;
          label: string;
          matches: Array<{
            matchIndex: number;
            matchId: string | null;
            gameId: string | null;
            slotA: { userId: string | null; seedIndex: number | null; displayName: string };
            slotB: { userId: string | null; seedIndex: number | null; displayName: string };
            winner: 'A' | 'B' | null;
            scoreA: number | null;
            scoreB: number | null;
            startedAt: string | null;
            finishedAt: string | null;
          }>;
        }>;
        lastCompletedRound: number;
        builtAt: string | null;
      };
      participants: Array<{ userId: string | { _id: string; username?: string }; finalPosition?: number | null; prizeAwarded?: number }>;
      winners: string[];
    }>(`/tournaments/${id}/bracket`);
  }

  /** Création d'un tournoi (draft si publishImmediately absent). */
  createTournament(input: {
    name: string;
    format: 'DUO_STEEL' | 'HYBRID_ALLIANCE' | 'ROYAL_SQUARE';
    capacity: 4 | 8 | 16 | 32 | 64 | 128;
    entryFee: number;
    startAt: string;
    description?: string;
    color?: string;
    icon?: string;
    minLevel?: number;
    maxLevel?: number | null;
    prizesByPosition?: Array<{ position: number; prize: number }>;
    publishImmediately?: boolean;
  }) {
    return this.call<{ tournamentId: string }>('/tournaments', { method: 'POST', body: JSON.stringify(input) });
  }

  /** DRAFT → UPCOMING (visible aux joueurs). */
  publishTournament(id: string) {
    return this.call<{ published: true }>(`/tournaments/${id}/publish`, { method: 'POST' });
  }

  // --- Games / replays ----------------------------------------------------
  listGames(scope: HistoryScope = 'mine', opts: { page?: number; kind?: string; mode?: string } = {}) {
    const params = new URLSearchParams({ scope, page: String(opts.page ?? 1) });
    if (opts.kind && opts.kind !== 'all') params.set('kind', opts.kind);
    if (opts.mode && opts.mode !== 'all') params.set('mode', opts.mode);
    return this.call<GamesPage>(`/games?${params.toString()}`);
  }
  /** Lance une partie 100% robots sur le serveur (archivée dans l'historique). */
  simulateRobotGame(robotIds: string[], opts: { visibility?: 'public' | 'private'; forTeam?: string | null; manches?: 1 | 2 | 4 } = {}) {
    return this.call<{ gameId: string; winner: 'A' | 'B' | null; scoreA: number; scoreB: number }>('/games/robots', { method: 'POST', body: JSON.stringify({ robotIds, ...opts }) });
  }
  getGame(id: string) { return this.call<{ game: ServerGame }>(`/games/${id}`); }
  saveGame(body: unknown) { return this.call<{ id: string }>('/games', { method: 'POST', body: JSON.stringify(body) }); }

  // --- Analytics ----------------------------------------------------------
  myStats() { return this.call<{ stats: unknown }>('/analytics/me'); }
  robotStats(id: string) { return this.call<{ stats: unknown }>(`/analytics/robots/${id}`); }

  // --- Tables (jeu en ligne — lobby) ---------------------------------------
  listTables(opts: { scope?: 'all' | 'team' | 'public'; page?: number } = {}) {
    const params = new URLSearchParams({ scope: opts.scope ?? 'all', page: String(opts.page ?? 1) });
    return this.call<{ tables: ServerTable[]; page: number; pageSize: number; total: number; totalPages: number }>(`/tables?${params.toString()}`);
  }
  /** v14.7 — Parties publiques actuellement en cours (max 5/page). */
  listPublicLive(page = 1) {
    return this.call<{ tables: ServerTable[]; page: number; pageSize: number; total: number; totalPages: number }>(`/tables/public-live?page=${page}`);
  }
  createTable(opts: { visibility?: 'public' | 'private'; kind?: TableKind; robotIds?: string[]; forTeam?: boolean } = {}) {
    return this.call<{ table: ServerTable }>('/tables', { method: 'POST', body: JSON.stringify({ visibility: opts.visibility ?? 'public', kind: opts.kind ?? 'hybride', robotIds: opts.robotIds ?? [], forTeam: !!opts.forTeam }) });
  }
  startTable(tableId: string) { return this.call<{ ok: boolean }>(`/tables/${tableId}/start`, { method: 'POST' }); }
  getTable(id: string) { return this.call<{ table: ServerTable }>(`/tables/${id}`); }
  takeSeat(tableId: string, index: number, assignment: 'me' | string) {
    // Le serveur attend le champ `as` (et non `assignment`).
    return this.call<{ table: ServerTable }>(`/tables/${tableId}/seat`, { method: 'POST', body: JSON.stringify({ index, as: assignment }) });
  }
  leaveTable(tableId: string) { return this.call<{ ok: boolean }>(`/tables/${tableId}/leave`, { method: 'POST' }); }
  cancelTable(tableId: string) { return this.call<{ ok: boolean }>(`/tables/${tableId}/cancel`, { method: 'POST' }); }
  publicReplays(q: string) { return this.call<{ games: PublicGame[] }>(`/games/public?q=${encodeURIComponent(q)}`); }

  // --- Wallet -------------------------------------------------------------
  wallet() { return this.call<ServerWallet>('/wallet'); }
  claimDailyTokens() { return this.call<{ claimed: boolean; balance: number; reward: number }>('/wallet/claim', { method: 'POST' }); }
  /** Recharge des jetons via un code promo (12 chiffres, tirets ignorés). */
  redeemPromo(code: string) { return this.call<{ tokens: number; balance: number }>('/promo/redeem', { method: 'POST', body: JSON.stringify({ code }) }); }
  /** Statut VIP courant (serveur : source de vérité). */
  getVipStatus() { return this.call<{ expiresAt: string | null }>('/wallet/vip'); }
  /** Achète/prolonge le VIP en débitant les jetons côté serveur. */
  purchaseVip(planId: string) { return this.call<{ expiresAt: string | null; balance: number }>('/wallet/vip', { method: 'POST', body: JSON.stringify({ planId }) }); }

  // --- Teams --------------------------------------------------------------
  listTeams() { return this.call<{ teams: ServerTeamSummary[] }>('/teams'); }
  myTeam() { return this.call<ServerTeamDetail>('/teams/mine'); }
  createTeam(name: string, visibility: 'public' | 'private' = 'private') {
    return this.call<{ team: { id: string; name: string; visibility: string } }>('/teams', { method: 'POST', body: JSON.stringify({ name, visibility }) });
  }
  getTeam(id: string) { return this.call<ServerTeamDetail>(`/teams/${id}`); }
  updateTeam(id: string, updates: { name?: string; visibility?: 'public' | 'private' }) {
    return this.call<{ team: { id: string; name: string; visibility: string } }>(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }
  joinTeam(id: string) { return this.call<{ ok: boolean; team: { id: string; name: string } }>(`/teams/${id}/join`, { method: 'POST' }); }
  leaveTeam(id: string) { return this.call<{ ok: boolean }>(`/teams/${id}/leave`, { method: 'POST' }); }
  kickMember(teamId: string, userId: string) { return this.call<{ ok: boolean }>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }); }
  changeMemberRole(teamId: string, userId: string, role: TeamRoleClient) {
    return this.call<{ ok: boolean }>(`/teams/${teamId}/members/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
  }

  // --- Invitations --------------------------------------------------------
  /** Recherche d'utilisateurs par pseudo (pour inviter). */
  searchUsers(query: string) { return this.call<{ users: { id: string; username: string }[] }>(`/users/search?q=${encodeURIComponent(query)}`); }
  /** Profil public d'un joueur (infos, robots, bilan). */
  getUserProfile(userId: string) { return this.call<{ profile: ServerUserProfile }>(`/users/${userId}/profile`); }
  /** Envoie une invitation (par pseudo, e-mail ou id) — réservé au propriétaire. */
  invite(teamId: string, identifier: string) { return this.call<{ invitation: ServerInvitationSent }>(`/teams/${teamId}/invite`, { method: 'POST', body: JSON.stringify({ identifier }) }); }
  /** Invitations REÇUES en attente. */
  listReceivedInvitations() { return this.call<{ invitations: ServerInvitationReceived[] }>('/invitations'); }
  /** Nombre d'invitations reçues (badge de notification). */
  countInvitations() { return this.call<{ count: number }>('/invitations/count'); }
  /** Invitations ENVOYÉES en attente pour une équipe (propriétaire). */
  listSentInvitations(teamId: string) { return this.call<{ invitations: ServerInvitationSent[] }>(`/teams/${teamId}/invitations`); }
  acceptInvitation(id: string) { return this.call<{ ok: boolean; teamId: string }>(`/invitations/${id}/accept`, { method: 'POST' }); }
  declineInvitation(id: string) { return this.call<{ ok: boolean }>(`/invitations/${id}/decline`, { method: 'POST' }); }
  cancelInvitation(id: string) { return this.call<{ ok: boolean }>(`/invitations/${id}/cancel`, { method: 'POST' }); }
}

/** Rôle d'un membre d'équipe (mêmes valeurs que côté serveur). */
export type TeamRoleClient = 'owner' | 'super' | 'admin' | 'user';
/** Profil public d'un joueur (popup infos / robots / stats). */
export interface ServerUserProfile {
  id: string; username: string; level: number; rewardPoints: number; rank: string;
  gamesPlayed: number; wins: number; losses: number; robotCount: number;
  robots: { id: string; name: string; elo: number; avatarId: string | null }[];
  team: { id: string; name: string; visibility: 'public' | 'private' } | null;
}
/** Invitation reçue (côté destinataire). */
export interface ServerInvitationReceived { id: string; team: { id: string; name: string; visibility: 'public' | 'private' }; from: { id: string; username: string }; createdAt: string }
/** Invitation envoyée (côté propriétaire d'équipe). */
export interface ServerInvitationSent { id: string; to: { id: string; username: string }; status: string }

export interface ServerTeamSummary { id: string; name: string; points: number; members: number; visibility: 'public' | 'private' }

export interface ServerTeamMember { id: string; username: string; role: TeamRoleClient; rewardPoints: number; level: number; joinedAt?: string }

export interface ServerTeamDetail {
  team: { id: string; name: string; points: number; owner: string; visibility: 'public' | 'private' } | null;
  members: ServerTeamMember[];
  myRole: TeamRoleClient | null;
}

export interface ServerWalletTransaction { kind: 'daily' | 'game_stake' | 'game_win' | 'refund' | 'promo'; amount: number; balance: number; at: string; game: string | null }

export interface ServerWallet {
  balance: number;
  canClaimToday: boolean;
  lastClaimDay: string | null;
  transactions: ServerWalletTransaction[];
}

/** v16 — Match attendu (adversaire en cours de désignation) avec score live. */
export interface AwaitedTournamentMatch {
  matchId: string | null;
  roundIndex: number;
  matchIndex: number;
  slotAName: string;
  slotBName: string;
  scoreA: number | null;
  scoreB: number | null;
  winner: 'A' | 'B' | null;
  tableId: string | null;
}

/** v16 — Statut actif du joueur dans un tournoi live. */
export interface TournamentActive {
  tournamentId: string;
  name: string;
  format: string;
  color: string;
  icon: string;
  state: 'champion' | 'playing' | 'waiting' | 'pending' | 'eliminated' | 'none';
  roundIndex: number | null;
  roundLabel: string;
  /** v16 — instant de démarrage planifié (compte à rebours), état 'pending'. */
  startsAt: string | null;
  myMatchId: string | null;
  myTableId: string | null;
  awaiting: AwaitedTournamentMatch[];
  /** v16 — délai (s) avant redirection auto depuis la popup LIVE. */
  autoRejoinSec?: number;
}

/** Forme serveur d'un robot (serializer listByOwner). */
export interface ServerRobot {
  id: string;
  name: string;
  personality: { aggressiveness: number; concentration: number; velocity: number };
  responseTimeMs: number;
  maxPlayTimeMs: number;
  algoSpec: unknown;
  offlineEnabled: boolean;
  representativeSlot: number;
  mobile: { avatarId: string; strategy: { aggro: number; risk: number; bluff: number; memoire: number } } | null;
}

/** Forme serveur d'une partie sauvegardée. */
export interface GameStatsBlock {
  totalDonnes: number; totalTricksA: number; totalTricksB: number;
  contres: number; surcontres: number; contresReussies: number;
  capotsA: number; capotsB: number; capotsTotal: number;
  capotsAnnoncesA: number; capotsAnnoncesB: number; capotsAnnoncesTotal: number;
  belotesA: number; belotesB: number;
}
export interface GameParticipantLite { seatIndex: number; team: 'A' | 'B'; type: 'human' | 'robot'; name: string; userId: string | null; wasSubstitute: boolean }
export interface ServerGame {
  /** Identifiant sérialisé par le serveur (champ `id`, PAS `_id`). */
  id: string;
  mode: 'local' | 'online' | 'competition';
  kind?: 'hybride' | 'acier' | 'royal' | 'local';
  winner: 'A' | 'B' | null;
  createdAt: string;
  replay?: unknown;
  players?: { name?: string }[];
  participants?: GameParticipantLite[];
  finalScore?: { A: number; B: number };
  manchesWon?: { A: number; B: number };
  stats?: GameStatsBlock | null;
  visibility?: 'public' | 'private';
  target?: number;
  manches?: { number: number; target: number; winner: 'A' | 'B' | null; scoreTeamA: number; scoreTeamB: number }[];
}
/** Réponse paginée de l'historique. */
export interface GamesPage { games: ServerGame[]; page: number; pageSize: number; total: number; totalPages: number }
/** Portée d'historique. */
export type HistoryScope = 'mine' | 'myrobots' | 'team' | 'public';

export const api = new ApiClient();


/** Table de jeu en ligne (lobby) — forme du serializer serveur. */
export interface ServerTableSeat { index: number; kind: 'empty' | 'human' | 'robot'; name: string; team: 'A' | 'B'; userId: string | null; robotId: string | null; ownerId: string | null }
/** Type de partie en ligne (SPEC §3.3). */
export type TableKind = 'hybride' | 'acier' | 'royal';

export interface ServerTable { id: string; status: 'lobby' | 'playing' | 'finished' | 'draft'; kind: TableKind; owner: string; visibility: 'public' | 'private'; seats: ServerTableSeat[]; startsAt: string | null }

/** Résultat de la recherche publique de replays par nom (SPEC §3.10). */
export interface PublicGame { id: string; mode: string; winner: 'A' | 'B' | null; createdAt: string; participants: { name: string; type: 'human' | 'robot'; team: 'A' | 'B'; userId: string | null }[] }
