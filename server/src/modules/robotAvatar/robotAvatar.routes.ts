/* =============================================================================
 * ROBOT-AVATAR · robotAvatar.routes.ts — Catalogue servi au mobile.
 * -----------------------------------------------------------------------------
 * `GET /avatars` renvoie les avatars ACTIFS proposables au joueur courant
 * (filtrés par son NIVEAU). Le mobile ne code plus aucun avatar en dur.
 * ========================================================================== */
import { Router } from 'express';
import type { Response } from 'express';
import { requireAuthentication, type AuthenticatedRequest } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { robotAvatarService } from './robotAvatar.service.js';
import { UserModel } from '../user/user.model.js';
import { computePlayerLevel } from '../../shared/levels.js';

export const robotAvatarRouter = Router();

robotAvatarRouter.get('/avatars', requireAuthentication, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user: any = await UserModel.findById(req.userId).select('rewardPoints').lean();
  const level = computePlayerLevel(user?.rewardPoints ?? 0);
  const avatars = await robotAvatarService.listForPlayer(level);
  res.json({ avatars, level });
}));
