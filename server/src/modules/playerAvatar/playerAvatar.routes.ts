/* =============================================================================
 * PLAYER-AVATAR · playerAvatar.routes.ts — Catalogue de logos joueurs (mobile).
 * -----------------------------------------------------------------------------
 * `GET /player-avatars` renvoie les logos ACTIFS proposés au joueur pour son
 * profil (choix libre, aucun filtre de niveau).
 * ========================================================================== */
import { Router } from 'express';
import type { Response } from 'express';
import { requireAuthentication, type AuthenticatedRequest } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { playerAvatarService } from './playerAvatar.service.js';

export const playerAvatarRouter = Router();

playerAvatarRouter.get('/player-avatars', requireAuthentication, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const avatars = await playerAvatarService.listActive();
  res.json({ avatars });
}));
