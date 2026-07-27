// ============================================================================
//  PORTS — interfaces que l'application exige du monde extérieur.
//  Le domaine et les use cases ne connaissent QUE ces interfaces ; les adapters
//  (Mongo, mémoire, socket…) les implémentent. Aucune dépendance technique ici.
// ============================================================================

import type { AlgoSpec, Personality, ReplayRecord } from 'belote-core';

export type Id = string;

export interface UserDTO { id: Id; username: string; teamId: Id | null; rewardPoints: number; }
export interface TeamDTO { id: Id; name: string; ownerId: Id; points: number; }
export interface RobotDTO {
  id: Id; ownerId: Id; name: string; personality: Personality;
  responseTimeMs: number; maxPlayTimeMs: number;
  algoSpec: AlgoSpec; offlineEnabled: boolean; representativeSlot: 0 | 1 | 2 | 3 | 4;
}
export type Visibility = 'public' | 'private' | 'team';
export interface GameDTO {
  id: Id; ownerId: Id; players: Id[]; teamId: Id | null;
  visibility: Visibility; mode: 'local' | 'online';
  winner?: 'A' | 'B'; target: number; replay: ReplayRecord; createdAt: number;
}

// ---- repositories ----------------------------------------------------------

export interface UserRepository {
  get(id: Id): Promise<UserDTO | null>;
  findByUsername(username: string): Promise<UserDTO | null>;
  create(input: { username: string }): Promise<UserDTO>;
  setTeam(userId: Id, teamId: Id | null): Promise<void>;
  searchByUsername(prefix: string, limit: number): Promise<UserDTO[]>;
}

export interface TeamRepository {
  get(id: Id): Promise<TeamDTO | null>;
  findByName(name: string): Promise<TeamDTO | null>;
  create(input: { name: string; ownerId: Id }): Promise<TeamDTO>;
  listRanked(limit: number): Promise<{ team: TeamDTO; members: number }[]>;
  membersOf(teamId: Id): Promise<UserDTO[]>;
}

export interface RobotRepository {
  get(id: Id): Promise<RobotDTO | null>;
  create(input: Omit<RobotDTO, 'id'>): Promise<RobotDTO>;
  update(id: Id, patch: Partial<RobotDTO>): Promise<RobotDTO | null>;
  remove(id: Id): Promise<void>;
  listByOwner(ownerId: Id): Promise<RobotDTO[]>;
  clearRepresentativeSlot(ownerId: Id, slot: number, exceptId: Id): Promise<void>;
}

export interface GameRepository {
  save(game: GameDTO): Promise<Id>;
  get(id: Id): Promise<GameDTO | null>;
  list(filter: { ownerOrPlayer?: Id; visibility?: Visibility; teamId?: Id }): Promise<GameDTO[]>;
}

// ---- services techniques ----------------------------------------------------

export interface IdGenerator { next(): Id; }
export interface Clock { now(): number; }
export interface RandomSource { int(maxExclusive: number): number; }
