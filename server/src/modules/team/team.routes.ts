import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { teamController } from './team.controller.js';

export const teamRouter = Router();
teamRouter.get('/teams', requireAuthentication, asyncHandler((req, res) => teamController.listRanked(req, res)));
teamRouter.get('/teams/mine', requireAuthentication, asyncHandler((req, res) => teamController.getMyTeam(req, res)));
teamRouter.post('/teams', requireAuthentication, asyncHandler((req, res) => teamController.create(req, res)));
teamRouter.get('/teams/:id', requireAuthentication, asyncHandler((req, res) => teamController.getDetail(req, res)));
teamRouter.patch('/teams/:id', requireAuthentication, asyncHandler((req, res) => teamController.update(req, res)));
teamRouter.post('/teams/:id/join', requireAuthentication, asyncHandler((req, res) => teamController.join(req, res)));
teamRouter.post('/teams/leave', requireAuthentication, asyncHandler((req, res) => teamController.leave(req, res)));
