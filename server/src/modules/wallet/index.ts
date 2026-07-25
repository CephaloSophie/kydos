import type { AppModule } from '../../core/AppModule.js';
import { walletRouter } from './wallet.routes.js';

export const walletModule: AppModule = { name: 'wallet', basePath: '/', router: walletRouter };
export { walletService } from './wallet.service.js';
