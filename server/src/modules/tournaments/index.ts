import type { AppModule } from '../../core/AppModule.js';
import { tournamentRouter } from './tournament.routes.js';
import { tournamentWorker } from './tournament.worker.js';

export const tournamentModule: AppModule = {
  name: 'tournaments',
  router: tournamentRouter,
  startBackgroundTasks: () => tournamentWorker.start(),
};
