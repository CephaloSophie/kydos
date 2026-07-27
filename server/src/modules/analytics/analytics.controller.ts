import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { analyticsService } from './analytics.service.js';

export class AnalyticsController {
  async robotStats(request: AuthenticatedRequest, response: Response) {
    response.json({ stats: await analyticsService.getRobotStats(request.params.id) });
  }
  async myStats(request: AuthenticatedRequest, response: Response) {
    response.json({ stats: await analyticsService.getPlayerStats(request.userId!) });
  }
  async rebuild(_request: AuthenticatedRequest, response: Response) {
    const { gameProjectionService } = await import('./gameProjection.service.js');
    response.json({ result: await gameProjectionService.rebuildOutdated() });
  }
}

export const analyticsController = new AnalyticsController();
