// ============================================================================
//  USE CASES (application) — chaque cas dépend UNIQUEMENT des ports (interfaces).
//  + adapters EN MÉMOIRE (pour le mode local d'un front, et pour les tests),
//    interchangeables avec des adapters Mongo côté serveur.
// ============================================================================

import { normalizeAlgo, type AlgoSpec, type Personality } from 'belote-core';
import type {
  Clock, GameDTO, GameRepository, Id, IdGenerator, RandomSource,
  RobotDTO, RobotRepository, TeamDTO, TeamRepository, UserDTO, UserRepository, Visibility,
} from './ports';

export interface AppDeps {
  users: UserRepository;
  teams: TeamRepository;
  robots: RobotRepository;
  games: GameRepository;
  ids: IdGenerator;
  clock: Clock;
}

// ---- robots ----------------------------------------------------------------

export async function createRobot(
  deps: Pick<AppDeps, 'robots'>,
  input: { ownerId: Id; name: string; personality: Personality; responseTimeMs?: number; maxPlayTimeMs?: number; algoSpec?: Partial<AlgoSpec>; offlineEnabled?: boolean; representativeSlot?: 0 | 1 | 2 | 3 | 4 },
): Promise<RobotDTO> {
  if (!input.name.trim()) throw new Error('nom requis');
  if (input.representativeSlot && input.representativeSlot > 0)
    await deps.robots.clearRepresentativeSlot(input.ownerId, input.representativeSlot, '');
  return deps.robots.create({
    ownerId: input.ownerId, name: input.name, personality: input.personality,
    responseTimeMs: input.responseTimeMs ?? 1000, maxPlayTimeMs: input.maxPlayTimeMs ?? 10000,
    algoSpec: normalizeAlgo(input.algoSpec), offlineEnabled: input.offlineEnabled ?? false,
    representativeSlot: input.representativeSlot ?? 0,
  });
}

export const listRobots = (deps: Pick<AppDeps, 'robots'>, ownerId: Id) => deps.robots.listByOwner(ownerId);
export const offlineRobots = async (deps: Pick<AppDeps, 'robots'>, ownerId: Id) =>
  (await deps.robots.listByOwner(ownerId)).filter((r) => r.offlineEnabled);

// ---- équipes ---------------------------------------------------------------

export async function createTeam(deps: Pick<AppDeps, 'teams' | 'users'>, input: { name: string; ownerId: Id }): Promise<TeamDTO> {
  if (await deps.teams.findByName(input.name)) throw new Error('nom déjà pris');
  const team = await deps.teams.create(input);
  await deps.users.setTeam(input.ownerId, team.id);
  return team;
}
export async function joinTeam(deps: Pick<AppDeps, 'teams' | 'users'>, input: { userId: Id; teamId: Id }) {
  if (!(await deps.teams.get(input.teamId))) throw new Error('équipe introuvable');
  await deps.users.setTeam(input.userId, input.teamId);
}
export const listTeamsRanked = (deps: Pick<AppDeps, 'teams'>, limit = 100) => deps.teams.listRanked(limit);
export const searchPlayers = (deps: Pick<AppDeps, 'users'>, prefix: string) => deps.users.searchByUsername(prefix, 8);

// ---- parties (historique + visibilité) -------------------------------------

export async function saveGame(deps: Pick<AppDeps, 'games' | 'users' | 'ids' | 'clock'>, input: Omit<GameDTO, 'id' | 'createdAt'>): Promise<Id> {
  return deps.games.save({ ...input, id: deps.ids.next(), createdAt: deps.clock.now() });
}
export async function getGameForUser(deps: Pick<AppDeps, 'games' | 'users'>, gameId: Id, userId: Id): Promise<GameDTO> {
  const game = await deps.games.get(gameId);
  if (!game) throw new Error('introuvable');
  const me = await deps.users.get(userId);
  const isParticipant = game.ownerId === userId || game.players.includes(userId);
  const sameTeam = game.visibility === 'team' && me?.teamId && me.teamId === game.teamId;
  if (!(game.visibility === 'public' || isParticipant || sameTeam)) throw new Error('partie privée');
  return game;
}
export function listGames(deps: Pick<AppDeps, 'games'>, scope: 'mine' | 'public' | 'team', ctx: { userId: Id; teamId: Id | null }) {
  if (scope === 'public') return deps.games.list({ visibility: 'public' });
  if (scope === 'team') return ctx.teamId ? deps.games.list({ visibility: 'team', teamId: ctx.teamId }) : Promise.resolve([] as GameDTO[]);
  return deps.games.list({ ownerOrPlayer: ctx.userId });
}

// ============================================================================
//  Adapters EN MÉMOIRE (implémentations des ports)
// ============================================================================

export class InMemoryIds implements IdGenerator { private n = 0; next() { return 'id_' + (++this.n).toString(36) + Date.now().toString(36); } }
export class SystemClock implements Clock { now() { return Date.now(); } }
export class SeededRandom implements RandomSource {
  private s: number;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  int(maxExclusive: number) { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s % maxExclusive; }
}

export class InMemoryUsers implements UserRepository {
  private byId = new Map<Id, UserDTO>();
  constructor(private ids: IdGenerator) {}
  async get(id: Id) { return this.byId.get(id) ?? null; }
  async findByUsername(u: string) { return [...this.byId.values()].find((x) => x.username === u) ?? null; }
  async create(input: { username: string }) { const u: UserDTO = { id: this.ids.next(), username: input.username, teamId: null, rewardPoints: 0 }; this.byId.set(u.id, u); return u; }
  async setTeam(userId: Id, teamId: Id | null) { const u = this.byId.get(userId); if (u) u.teamId = teamId; }
  async searchByUsername(prefix: string, limit: number) { const p = prefix.toLowerCase(); return [...this.byId.values()].filter((u) => u.username.toLowerCase().startsWith(p)).slice(0, limit); }
}

export class InMemoryTeams implements TeamRepository {
  private byId = new Map<Id, TeamDTO>();
  constructor(private ids: IdGenerator, private users: InMemoryUsers) {}
  async get(id: Id) { return this.byId.get(id) ?? null; }
  async findByName(name: string) { return [...this.byId.values()].find((t) => t.name === name) ?? null; }
  async create(input: { name: string; ownerId: Id }) { const t: TeamDTO = { id: this.ids.next(), name: input.name, ownerId: input.ownerId, points: 0 }; this.byId.set(t.id, t); return t; }
  async membersOf(teamId: Id) { const out: UserDTO[] = []; for (const u of (this.users as any).byId.values()) if (u.teamId === teamId) out.push(u); return out; }
  async listRanked(limit: number) {
    const rows = await Promise.all([...this.byId.values()].map(async (team) => ({ team, members: (await this.membersOf(team.id)).length })));
    return rows.sort((a, b) => b.team.points - a.team.points || b.members - a.members).slice(0, limit);
  }
}

export class InMemoryRobots implements RobotRepository {
  private byId = new Map<Id, RobotDTO>();
  constructor(private ids: IdGenerator) {}
  async get(id: Id) { return this.byId.get(id) ?? null; }
  async create(input: Omit<RobotDTO, 'id'>) { const r: RobotDTO = { ...input, id: this.ids.next() }; this.byId.set(r.id, r); return r; }
  async update(id: Id, patch: Partial<RobotDTO>) { const r = this.byId.get(id); if (!r) return null; Object.assign(r, patch); return r; }
  async remove(id: Id) { this.byId.delete(id); }
  async listByOwner(ownerId: Id) { return [...this.byId.values()].filter((r) => r.ownerId === ownerId); }
  async clearRepresentativeSlot(ownerId: Id, slot: number, exceptId: Id) { for (const r of this.byId.values()) if (r.ownerId === ownerId && r.representativeSlot === slot && r.id !== exceptId) r.representativeSlot = 0; }
}

export class InMemoryGames implements GameRepository {
  private byId = new Map<Id, GameDTO>();
  async save(game: GameDTO) { this.byId.set(game.id, game); return game.id; }
  async get(id: Id) { return this.byId.get(id) ?? null; }
  async list(filter: { ownerOrPlayer?: Id; visibility?: Visibility; teamId?: Id }) {
    return [...this.byId.values()].filter((g) =>
      (filter.ownerOrPlayer ? g.ownerId === filter.ownerOrPlayer || g.players.includes(filter.ownerOrPlayer) : true) &&
      (filter.visibility ? g.visibility === filter.visibility : true) &&
      (filter.teamId ? g.teamId === filter.teamId : true),
    ).sort((a, b) => b.createdAt - a.createdAt);
  }
}

/** Assemble une suite d'adapters mémoire prête à l'emploi (mode local / tests). */
export function createInMemoryDeps(): AppDeps {
  const ids = new InMemoryIds();
  const users = new InMemoryUsers(ids);
  const teams = new InMemoryTeams(ids, users);
  const robots = new InMemoryRobots(ids);
  const games = new InMemoryGames();
  return { users, teams, robots, games, ids, clock: new SystemClock() };
}
