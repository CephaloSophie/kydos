import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { matchmakingController } from './matchmaking.controller.js';

export const matchmakingRouter = Router();
matchmakingRouter.post('/matches/enqueue', requireAuthentication, asyncHandler((req, res) => matchmakingController.enqueue(req, res)));
matchmakingRouter.post('/matches/cancel', requireAuthentication, asyncHandler((req, res) => matchmakingController.cancel(req, res)));
matchmakingRouter.get('/matches/queues', requireAuthentication, asyncHandler((req, res) => matchmakingController.queues(req, res)));
matchmakingRouter.post('/matches/:id/run', requireAuthentication, asyncHandler((req, res) => matchmakingController.runHeadless(req, res)));
