import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { authController } from './auth.controller.js';

export const authRouter = Router();
authRouter.post('/auth/register', asyncHandler((req, res) => authController.register(req, res)));
authRouter.post('/auth/login', asyncHandler((req, res) => authController.login(req, res)));
authRouter.get('/auth/me', requireAuthentication, asyncHandler((req, res) => authController.getCurrentUser(req, res)));
authRouter.put('/settings', requireAuthentication, asyncHandler((req, res) => authController.updateSettings(req, res)));
