import type { AppModule } from '../../core/AppModule.js';
import { promoRouter } from './promo.routes.js';

export const promoModule: AppModule = { name: 'promo', basePath: '/', router: promoRouter };
export { promoService } from './promo.service.js';
