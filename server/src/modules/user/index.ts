import type { AppModule } from '../../core/AppModule.js';
import { userRouter } from './user.routes.js';

export const userModule: AppModule = {
  name: 'user',
  basePath: '/',
  router: userRouter,
};

export { UserModel } from './user.model.js';
export { userService } from './user.service.js';
export { serializePublicUser } from './user.serializer.js';
