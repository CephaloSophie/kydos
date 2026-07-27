import type { AppModule } from '../../core/AppModule.js';
import { authRouter } from './auth.routes.js';

export const authModule: AppModule = {
  name: 'auth',
  basePath: '/',
  router: authRouter,
};
