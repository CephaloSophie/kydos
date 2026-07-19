import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { gameController } from './game.controller.js';

export const gameRouter = Router();
gameRouter.get('/games', requireAuthentication, asyncHandler((req, res) => gameController.list(req, res)));
gameRouter.get('/games/:id', requireAuthentication, asyncHandler((req, res) => gameController.getById(req, res)));
gameRouter.post('/games', requireAuthentication, asyncHandler((req, res) => gameController.save(req, res)));
