import type { AppModule } from '../../core/AppModule.js';
import { playerAvatarRouter } from './playerAvatar.routes.js';

export const playerAvatarModule: AppModule = { name: 'playerAvatar', basePath: '/', router: playerAvatarRouter };
export { PlayerAvatarModel } from './playerAvatar.model.js';
export { playerAvatarService } from './playerAvatar.service.js';
