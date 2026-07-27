import type { AppModule } from '../../core/AppModule.js';
import { teamRouter } from './team.routes.js';

export const teamModule: AppModule = { name: 'team', basePath: '/', router: teamRouter };
export { TeamModel } from './team.model.js';
