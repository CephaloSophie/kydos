import { apiService } from './ApiService.js';
import type { RobotListItem } from '../models/Robot.model.js';

/**
 * Accès REST aux robots. Renvoie la FICHE COMPLÈTE (personnalité + algoSpec…),
 * pour que le front construise les robots EXACTEMENT comme le back (via robotFromFiche).
 */
export class RobotApiService {
  async listMine(): Promise<RobotListItem[]> {
    const result = await apiService.fetch<{ robots: any[] }>('/robots');
    return (result.robots ?? []).map((robotDocument: any) => ({
      id: String(robotDocument._id ?? robotDocument.id),
      name: robotDocument.name,
      personality: robotDocument.personality,
      responseTimeMs: robotDocument.responseTimeMs,
      maxPlayTimeMs: robotDocument.maxPlayTimeMs,
      algoSpec: robotDocument.algoSpec ?? null,
    }));
  }
}

export const robotApiService = new RobotApiService();
