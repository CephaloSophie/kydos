import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler.js';
import { requireAuthentication, type AuthenticatedRequest } from '../../shared/authentication.js';
import { archiveService } from './archive.service.js';

export const archiveRouter = Router();
archiveRouter.use(requireAuthentication);

/** Fil d'activité global — dernières modifications, tous auteurs confondus. */
archiveRouter.get('/archive/recent', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limit = Number(req.query.limit ?? 100);
  const entries = await archiveService.recent(limit);
  res.json({ archive: entries });
}));

/** Modifications d'un utilisateur (`/archive/by/ameur`). */
archiveRouter.get('/archive/by/:username', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const entries = await archiveService.listByUser(String(req.params.username));
  res.json({ archive: entries });
}));
