import type { AppModule } from '../../core/AppModule.js';
import { brainRouter } from './brain.routes.js';

export const brainModule: AppModule = { name: 'brain', basePath: '/', router: brainRouter };
export { BrainProjectModel } from './brain.model.js';
