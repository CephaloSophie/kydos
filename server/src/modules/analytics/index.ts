import type { AppModule } from '../../core/AppModule.js';
import { eventBus, DomainEvents, type GameFinishedPayload } from '../../core/eventBus.js';
import { analyticsRouter } from './analytics.routes.js';
import { gameProjectionService } from './gameProjection.service.js';

/**
 * Module ANALYTICS — côté LECTURE (CQRS). S'abonne à `game.finished` (aucun import
 * depuis le module game → découplage réel) et projette hors chemin critique.
 * Autonome : si on le retire, les parties continuent d'être persistées ; on perd
 * seulement les statistiques dérivées (reconstructibles via rebuild).
 */
export const analyticsModule: AppModule = {
  name: 'analytics',
  basePath: '/',
  router: analyticsRouter,
  startBackgroundTasks: () => {
    eventBus.subscribe<GameFinishedPayload>(DomainEvents.GameFinished, async ({ gameId }) => { await gameProjectionService.projectGame(gameId); });
  },
};

export { gameProjectionService } from './gameProjection.service.js';
export { ParticipationFactModel } from './participationFact.model.js';
