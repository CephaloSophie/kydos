import type { AppModule } from '../../core/AppModule.js';
import { invitationRouter } from './invitation.routes.js';

export const invitationModule: AppModule = { name: 'invitation', basePath: '/', router: invitationRouter };
