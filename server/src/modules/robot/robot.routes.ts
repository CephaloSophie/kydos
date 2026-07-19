import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { robotController } from './robot.controller.js';

export const robotRouter = Router();
robotRouter.get('/robots', requireAuthentication, asyncHandler((req, res) => robotController.list(req, res)));
robotRouter.post('/robots', requireAuthentication, asyncHandler((req, res) => robotController.create(req, res)));
robotRouter.put('/robots/:id', requireAuthentication, asyncHandler((req, res) => robotController.update(req, res)));
robotRouter.delete('/robots/:id', requireAuthentication, asyncHandler((req, res) => robotController.remove(req, res)));
robotRouter.get('/robots/:id', requireAuthentication, asyncHandler((req, res) => robotController.getPublicProfile(req, res)));
