/* =============================================================================
 * DOMAIN · usecases/TeamService.ts — Cas d'usage liés aux équipes (mobile).
 * -----------------------------------------------------------------------------
 * Enveloppe les appels API en méthodes de domaine explicites (crée, rejoint,
 * gère les membres) — les écrans ne connaissent QUE ce service, jamais
 * ApiClient directement.
 * ========================================================================== */
import type { ApiClient, ServerTeamDetail, ServerTeamSummary, TeamRoleClient } from '../../data/ApiClient';
import type { EventBus } from '../../core/EventBus';
import type { TeamRole } from '../entities/Team';

export class TeamService {
  #api: ApiClient;
  #bus: EventBus;
  constructor(api: ApiClient, bus: EventBus) { this.#api = api; this.#bus = bus; }

  list(): Promise<ServerTeamSummary[]> { return this.#api.listTeams().then((r) => r.teams); }
  mine(): Promise<ServerTeamDetail> { return this.#api.myTeam(); }
  get(id: string): Promise<ServerTeamDetail> { return this.#api.getTeam(id); }

  async create(name: string, visibility: 'public' | 'private' = 'private') {
    const { team } = await this.#api.createTeam(name, visibility);
    this.#bus.emit('teams:changed');
    return team;
  }

  async rename(id: string, name: string) {
    const { team } = await this.#api.updateTeam(id, { name });
    this.#bus.emit('teams:changed');
    return team;
  }

  async setVisibility(id: string, visibility: 'public' | 'private') {
    const { team } = await this.#api.updateTeam(id, { visibility });
    this.#bus.emit('teams:changed');
    return team;
  }

  async join(id: string) { const r = await this.#api.joinTeam(id); this.#bus.emit('teams:changed'); return r; }
  async leave(id: string) { const r = await this.#api.leaveTeam(id); this.#bus.emit('teams:changed'); return r; }
  async kick(teamId: string, userId: string) { const r = await this.#api.kickMember(teamId, userId); this.#bus.emit('teams:changed'); return r; }

  async changeRole(teamId: string, userId: string, role: TeamRole) {
    const r = await this.#api.changeMemberRole(teamId, userId, role as TeamRoleClient);
    this.#bus.emit('teams:changed');
    return r;
  }
}
