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
  startAt: string;
  createdBy: string;
  participants: TournamentParticipant[];
  bracketTree: BracketTree;
  winners: string[];
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentParticipant {
  userId: string;
  robotIds: string[];
  substituteRobotId: string | null;
  seedIndex: number | null;
  eliminatedAtRound: number | null;
  finalPosition: number | null;
  prizeAwarded: number;
  joinedAt: string;
}

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

export interface BracketMatch {
  matchIndex: number;
  matchId: string | null;
  gameId: string | null;
  slotA: BracketSlot;
  slotB: BracketSlot;
  winner: 'A' | 'B' | null;
  scoreA: number | null;
  scoreB: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface BracketSlot {
  userId: string | null;
  seedIndex: number | null;
  displayName: string;
}

export interface RoundPrize {
  round: number;
  prize: number;
}

export interface PositionPrize {
  position: number;
  prize: number;
}

export type TournamentStatus = 'draft' | 'upcoming' | 'live' | 'finished';
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
