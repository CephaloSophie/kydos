import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { tournamentController } from './tournament.controller.js';

export const tournamentRouter = Router();
tournamentRouter.get('/tournaments', requireAuthentication, asyncHandler((req, res) => tournamentController.list(req, res)));
tournamentRouter.get('/tournaments/:id', requireAuthentication, asyncHandler((req, res) => tournamentController.getById(req, res)));
tournamentRouter.post('/tournaments/:id/join', requireAuthentication, asyncHandler((req, res) => tournamentController.join(req, res)));
tournamentRouter.post('/tournaments/:id/leave', requireAuthentication, asyncHandler((req, res) => tournamentController.leave(req, res)));
tournamentRouter.post('/tournaments/preview-economics', requireAuthentication, asyncHandler((req, res) => tournamentController.previewEconomics(req, res)));
