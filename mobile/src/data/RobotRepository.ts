/* =============================================================================
 * DATA · RobotRepository.ts — Dépôt de robots adossé au VRAI backend.
 * -----------------------------------------------------------------------------
 * Implémentation concrète de l'abstraction attendue par RobotService
 * (inversion de dépendance : le domaine ne connaît que l'interface).
 * Traduit entre la forme serveur (ServerRobot) et l'entité de domaine (Robot).
 * ========================================================================== */

import { api, type ApiClient, type ServerRobot } from './ApiClient';
import { Robot, personalityToStrategy, strategyToPersonality, type RobotData } from '../domain/entities/Robot';

/** Interface de dépôt (ce dont le domaine a besoin). */
export interface IRobotRepository {
  list(): Promise<Robot[]>;
  create(draft: RobotDraft): Promise<Robot>;
  update(id: string, draft: RobotDraft): Promise<Robot>;
  remove(id: string): Promise<void>;
}

export interface RobotDraft { name: string; avatarId: string; strategy: RobotData['strategy'] }

/** Traduit un robot serveur → entité de domaine (avatar + curseurs via `mobile`). */
export function toDomain(server: ServerRobot): Robot {
  const strategy = server.mobile?.strategy ?? personalityToStrategy(server.personality);
  return new Robot({
    id: server.id,
    name: server.name,
    avatarId: server.mobile?.avatarId ?? 'atne',
    strategy,
    elo: 1000,
    games: 0,
    wins: 0,
    status: 'idle',
  });
}

/** Corps POST /robots : personnalité MOTEUR + métadonnées d'affichage `mobile`. */
export function toServerBody(draft: RobotDraft) {
  return {
    name: draft.name.trim() || 'Robot',
    personality: strategyToPersonality(draft.strategy),
    mobile: { avatarId: draft.avatarId, strategy: draft.strategy },
  };
}

export class RobotRepository implements IRobotRepository {
  #api: ApiClient;
  constructor(client: ApiClient = api) { this.#api = client; }

  async list(): Promise<Robot[]> {
    const { robots } = await this.#api.listRobots();
    return robots.map(toDomain);
  }

  async create(draft: RobotDraft): Promise<Robot> {
    const { robot } = await this.#api.createRobot(toServerBody(draft));
    return new Robot({ id: robot.id, name: robot.name, avatarId: draft.avatarId, strategy: draft.strategy });
  }

  async update(id: string, draft: RobotDraft): Promise<Robot> {
    const { robot } = await this.#api.updateRobot(id, toServerBody(draft));
    return new Robot({ id: robot.id, name: robot.name, avatarId: draft.avatarId, strategy: draft.strategy });
  }

  async remove(id: string): Promise<void> { await this.#api.deleteRobot(id); }
}
