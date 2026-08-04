import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler.js';
import { authService } from './auth.service.js';
import { requireAuthentication, type AuthenticatedRequest } from '../../shared/authentication.js';
import { UserModel } from '../users/user.model.js';
import { notFound } from '../../core/HttpError.js';

export const authRouter = Router();

authRouter.post('/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const result = await authService.login(username ?? '', password ?? '');
  res.json(result);
}));

authRouter.get('/auth/me', requireAuthentication, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await UserModel.findById(req.userId);
  if (!user) throw notFound('utilisateur introuvable');
  res.json({ user: { id: String(user._id), username: user.username, displayName: user.displayName, role: user.role } });
}));
