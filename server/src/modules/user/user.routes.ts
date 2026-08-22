import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { userController } from './user.controller.js';

export const userRouter = Router();
userRouter.patch('/users/me', requireAuthentication, asyncHandler((req, res) => userController.updateMe(req, res)));
userRouter.get('/users/:id/profile', requireAuthentication, asyncHandler((req, res) => userController.getProfile(req, res)));
userRouter.get('/users/search', requireAuthentication, asyncHandler((req, res) => userController.search(req, res)));
