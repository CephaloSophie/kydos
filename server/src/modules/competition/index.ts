import type { Server } from 'socket.io';
import type { AppModule } from '../../core/AppModule.js';
import { competitionRouter } from './competition.routes.js';
import { registerCompetitionSocketHandlers } from './competition.socket.js';
import { competitionService } from './competition.service.js';

/**
 * Module COMPETITION — affrontements de robots joués 100% en backend via file de jobs.
 * Autonome (model + service + runner + queue + controller + routes + socket).
 * Destiné à devenir un micro-service en v7 : la file in-process sera remplacée par BullMQ,
 * le runner déplacé dans un worker dédié — sans changer le contrat des autres modules.
 */
export const competitionModule: AppModule = {
  name: 'competition',
  basePath: '/',
  router: competitionRouter,
  registerSocketHandlers: (server: Server) => {
    competitionService.attachSocketServer(server);
    registerCompetitionSocketHandlers(server);
  },
  startBackgroundTasks: () => { void competitionService.recoverPendingMatches(); },
};
