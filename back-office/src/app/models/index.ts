export interface Admin {
  id: string;
  username: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
}

export interface Tournament {
  _id: string;
  name: string;
  format: MatchFormat;
  status: TournamentStatus;
  capacity: TournamentCapacity;
  description: string;
  color: string;
  icon: string;
  minLevel: number;
  maxLevel: number | null;
  entryFee: number;
  rounds: RoundPrize[];
  prizesByPosition: PositionPrize[];
  gameConfig?: TournamentGameConfig;
  startAt: string;
  createdBy: string;
  participants: TournamentParticipant[];
  bracketTree: BracketTree;
  winners: TournamentWinner[];
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentGameConfig {
  manches: number;
  baseTarget: number;
  labelTarget: number;
  /** v17 — score initial des enchères (minBid, multiple de 10). */
  openingBidMin: number;
  /** v17 — belote (Roi+Dame d'atout) comptée dans le score ? */
  countBelote: boolean;
  /** v17 — sens du jeu (false = antihoraire, true = horaire). */
  clockwise: boolean;
  /** v19 — coefficient de score de la partie (barème Kýdos), défaut 1. */
  scoreCoefficient: number;
  roundCountdownSec: number;
  autoRejoinSec: number;
  trickDelayMs: number;
  speed: number;
  turnTimeoutMs: number;
  allowSpectators: boolean;
  feltTheme: string;
  /** v18 — thème de table (id de la bibliothèque), null = défaut. */
  tableThemeId: string | null;
  signals: { reflexion: boolean; repeatSuit: boolean };
}

/**
 * Participant enrichi renvoyé par GET /admin/tournaments/:id.
 * Les noms d'utilisateur et de robot sont résolus côté serveur pour éviter
 * l'affichage d'ObjectIds bruts dans l'IHM.
 */
export interface TournamentParticipant {
  userId: string;
  username: string | null;
  robots: { id: string; name: string }[];
  substituteRobot: { id: string; name: string } | null;
  seedIndex: number | null;
  eliminatedAtRound: number | null;
  finalPosition: number | null;
  prizeAwarded: number;
  joinedAt: string;
}

export interface TournamentWinner { userId: string; username: string | null }

export interface BracketTree {
  rounds: BracketRound[];
  builtAt: string | null;
  lastCompletedRound: number;
}

export interface BracketRound {
  roundIndex: number;
  label: string;
  matches: BracketMatch[];
}

/** État visuel unifié d'un match du bracket, calculé côté serveur. */
export type BracketMatchState = 'pending' | 'ready' | 'countdown' | 'live' | 'finished';

export interface BracketMatch {
  matchIndex: number;
  matchId: string | null;
  gameId: string | null;
  liveTableId: string | null;
  slotA: BracketSlot;
  slotB: BracketSlot;
  winner: 'A' | 'B' | null;
  /** Points de la manche courante/dernière (peut repartir de 0 entre manches). */
  scoreA: number | null;
  scoreB: number | null;
  /** v17 — manches gagnées (best-of-N) : score de progression monotone. */
  manchesA: number | null;
  manchesB: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  scheduledStartAt: string | null;
  state: BracketMatchState;
}

/**
 * Un slot représente une équipe : 1 joueur (formats 1v1) ou 2 coéquipiers
 * (Carrée royale). Les usernames sont résolus par le serveur ; displayName*
 * reste disponible comme repli si l'utilisateur n'existe plus.
 */
export interface BracketSlot {
  userId: string | null;
  username: string | null;
  seedIndex: number | null;
  userId2: string | null;
  username2: string | null;
  displayName: string;
  displayName2: string;
}

export interface RoundPrize {
  round: number;
  prize: number;
}

export interface PositionPrize {
  position: number;
  prize: number;
}

export type TournamentStatus = 'draft' | 'upcoming' | 'live' | 'finished' | 'cancelled';
export type TournamentCapacity = 4 | 8 | 16 | 32 | 64 | 128;
export type MatchFormat = 'duo_steel' | 'hybrid_alliance' | 'royal_square';

export const TOURNAMENT_CAPACITIES: TournamentCapacity[] = [4, 8, 16, 32, 64, 128];
export const MATCH_FORMATS: { value: MatchFormat; label: string; description: string }[] = [
  { value: 'duo_steel', label: 'Duo d\'acier', description: '2 robots contre 2 robots' },
  { value: 'hybrid_alliance', label: 'Alliance hybride', description: 'Humain + robot contre humain + robot' },
  { value: 'royal_square', label: 'Carrée royale', description: '4 humains, 2 équipes' },
];

export interface User {
  _id: string;
  username: string;
  email: string | null;
  role?: string;
  rewardPoints: number;
  gamesPlayed: number;
  wallet: {
    tokens: number;
    lastClaimDay: string | null;
    transactions?: WalletTransaction[];
  };
  activeSession: string | null;
  favoriteRobot: string | null;
  vipExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  kind: string;
  amount: number;
  balance: number;
  game: string | null;
  at: string;
}

export interface Robot {
  _id: string;
  owner: string;
  name: string;
  mobile: {
    avatarId: string;
    strategy: { aggro: number; risk: number; bluff: number; memoire: number };
  };
  representativeSlot: number;
  createdAt: string;
}

export interface Game {
  _id: string;
  owner: string;
  mode: string;
  kind: string;
  winner: 'A' | 'B' | null;
  finalScoreA: number;
  finalScoreB: number;
  participants: GameParticipant[];
  finishedAt: string;
  createdAt: string;
}

export interface GameParticipant {
  seatIndex: number;
  team: 'A' | 'B';
  type: 'human' | 'robot';
  user: string | null;
  robot: string | null;
  name: string;
}

export interface HouseTransaction {
  _id: string;
  kind: string;
  amount: number;
  matchId: string | null;
  tournamentId: string | null;
  round: number | null;
  userId: string | null;
  note: string;
  createdAt: string;
}

export interface AccountingSummary {
  period: { from: string; to: string };
  totals: {
    matchRake: number;
    tournamentEntries: number;
    tournamentPrizes: number;
    net: number;
  };
  byDay: { date: string; matchRake: number; tournamentNet: number }[];
}

export interface PromoCode {
  _id: string;
  code: string;
  tokens: number;
  expiresAt: string;
  maxRedemptions: number;
  redeemedBy: string[];
  active: boolean;
  label: string;
  createdAt: string;
}

export interface MonitorSnapshot {
  at: string;
  totalUsers: number;
  activeUsers: number;
  activeMatches: number;
  liveTournaments: number;
  queueSizes: Record<string, number>;
}

export interface EconomicsResult {
  totalCollected: number;
  totalPaid: number;
  houseNet: number;
  breakdown: { position: number; occupants: number; prizePerOccupant: number; totalPaidAtThisPosition: number }[];
}
