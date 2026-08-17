import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { matchmakingController } from './matchmaking.controller.js';

export const matchmakingRouter = Router();
matchmakingRouter.post('/matches/enqueue', requireAuthentication, asyncHandler((req, res) => matchmakingController.enqueue(req, res)));
matchmakingRouter.post('/matches/cancel', requireAuthentication, asyncHandler((req, res) => matchmakingController.cancel(req, res)));
matchmakingRouter.get('/matches/queues', requireAuthentication, asyncHandler((req, res) => matchmakingController.queues(req, res)));
matchmakingRouter.get('/matches/formats', requireAuthentication, asyncHandler((req, res) => matchmakingController.formats(req, res)));
matchmakingRouter.get('/matches/mine', requireAuthentication, asyncHandler((req, res) => matchmakingController.mine(req, res)));
matchmakingRouter.get('/matches/:id', requireAuthentication, asyncHandler((req, res) => matchmakingController.getById(req, res)));
matchmakingRouter.post('/matches/:id/live-table', requireAuthentication, asyncHandler((req, res) => matchmakingController.provisionLiveTable(req, res)));
matchmakingRouter.post('/matches/:id/run', requireAuthentication, asyncHandler((req, res) => matchmakingController.runHeadless(req, res)));
