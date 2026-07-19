import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { competitionController } from './competition.controller.js';

export const competitionRouter = Router();
competitionRouter.post('/competitions', requireAuthentication, asyncHandler((req, res) => competitionController.create(req, res)));
competitionRouter.get('/competitions', requireAuthentication, asyncHandler((req, res) => competitionController.listOpen(req, res)));
competitionRouter.get('/competitions/mine', requireAuthentication, asyncHandler((req, res) => competitionController.listMine(req, res)));
competitionRouter.get('/competitions/:id', requireAuthentication, asyncHandler((req, res) => competitionController.getById(req, res)));
competitionRouter.post('/competitions/:id/join', requireAuthentication, asyncHandler((req, res) => competitionController.join(req, res)));
competitionRouter.post('/competitions/:id/cancel', requireAuthentication, asyncHandler((req, res) => competitionController.cancel(req, res)));
