import type { AppModule } from '../../core/AppModule.js';
import { robotAvatarRouter } from './robotAvatar.routes.js';

export const robotAvatarModule: AppModule = { name: 'robotAvatar', basePath: '/', router: robotAvatarRouter };
export { RobotAvatarModel } from './robotAvatar.model.js';
export { robotAvatarService } from './robotAvatar.service.js';
