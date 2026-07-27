/* =============================================================================
 * DOMAIN · usecases/TeamService.ts — Cas d'usage liés aux équipes (mobile).
 * -----------------------------------------------------------------------------
 * Enveloppe les appels API en méthodes de domaine explicites (crée, rejoint,
 * gère les membres) — les écrans ne connaissent QUE ce service, jamais
 * ApiClient directement.
 * ========================================================================== */
import type { ApiClient, ServerTeamDetail, ServerTeamSummary, TeamRoleClient, ServerInvitationReceived, ServerInvitationSent } from '../../data/ApiClient';
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

  // --- Invitations --------------------------------------------------------
  searchUsers(query: string): Promise<{ id: string; username: string }[]> { return this.#api.searchUsers(query).then((r) => r.users); }
  receivedInvitations(): Promise<ServerInvitationReceived[]> { return this.#api.listReceivedInvitations().then((r) => r.invitations); }
  sentInvitations(teamId: string): Promise<ServerInvitationSent[]> { return this.#api.listSentInvitations(teamId).then((r) => r.invitations); }
  countInvitations(): Promise<number> { return this.#api.countInvitations().then((r) => r.count); }

  async invite(teamId: string, identifier: string) {
    const { invitation } = await this.#api.invite(teamId, identifier);
    this.#bus.emit('invitations:changed');
    return invitation;
  }
  async acceptInvitation(id: string) {
    const r = await this.#api.acceptInvitation(id);
    this.#bus.emit('invitations:changed');
    this.#bus.emit('teams:changed');
    return r;
  }
  async declineInvitation(id: string) {
    const r = await this.#api.declineInvitation(id);
    this.#bus.emit('invitations:changed');
    return r;
  }
  async cancelInvitation(id: string) {
    const r = await this.#api.cancelInvitation(id);
    this.#bus.emit('invitations:changed');
    return r;
  }
}
