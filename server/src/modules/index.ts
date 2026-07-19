import type { AppModule } from '../core/AppModule.js';
import { authModule } from './auth/index.js';
import { userModule } from './user/index.js';
import { teamModule } from './team/index.js';
import { invitationModule } from './invitation/index.js';
import { robotModule } from './robot/index.js';
import { tableModule } from './table/index.js';
import { gameModule } from './game/index.js';
import { analyticsModule } from './analytics/index.js';
import { competitionModule } from './competition/index.js';
import { brainModule } from './brain/index.js';

/**
 * Registre des modules applicatifs.
 * Ajouter / retirer un domaine = ajouter / retirer UNE ligne ici.
 */
export const applicationModules: AppModule[] = [
  authModule,
  userModule,
  teamModule,
  invitationModule,
  robotModule,
  tableModule,
  gameModule,
  analyticsModule,
  competitionModule,
  brainModule,
];
