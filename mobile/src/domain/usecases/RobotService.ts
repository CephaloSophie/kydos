/* =============================================================================
 * DOMAIN · usecases/RobotService.ts — Cas d'usage liés aux robots.
 * Port TypeScript du design system (js/domain/usecases/RobotService.js),
 * adossé au dépôt backend (asynchrone) plutôt qu'à localStorage.
 * Dépend d'une ABSTRACTION (IRobotRepository) → inversion de dépendance.
 * ========================================================================== */

import type { EventBus } from '../../core/EventBus';
import type { IRobotRepository, RobotDraft } from '../../data/RobotRepository';
import type { Robot } from '../entities/Robot';

export class RobotService {
  #repo: IRobotRepository;
  #bus: EventBus;

  constructor(repository: IRobotRepository, eventBus: EventBus) {
    this.#repo = repository;
    this.#bus = eventBus;
  }

  list(): Promise<Robot[]> { return this.#repo.list(); }

  /** Crée un robot depuis un brouillon d'éditeur, le persiste, notifie le bus. */
  async create(draft: RobotDraft): Promise<Robot> {
    const robot = await this.#repo.create(draft);
    this.#bus.emit('robots:changed');
    return robot;
  }

  async remove(id: string): Promise<void> {
    await this.#repo.remove(id);
    this.#bus.emit('robots:changed');
  }
}
