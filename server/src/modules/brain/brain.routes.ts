import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { brainController } from './brain.controller.js';

export const brainRouter = Router();
brainRouter.get('/brains', requireAuthentication, asyncHandler((q, s) => brainController.list(q, s)));
brainRouter.post('/brains', requireAuthentication, asyncHandler((q, s) => brainController.create(q, s)));
brainRouter.get('/brains/:id', requireAuthentication, asyncHandler((q, s) => brainController.getOne(q, s)));
brainRouter.put('/brains/:id/versions/:v', requireAuthentication, asyncHandler((q, s) => brainController.updateVersion(q, s)));
brainRouter.post('/brains/:id/versions', requireAuthentication, asyncHandler((q, s) => brainController.addVersion(q, s)));
brainRouter.put('/brains/:id/active/:v', requireAuthentication, asyncHandler((q, s) => brainController.switchVersion(q, s)));
brainRouter.post('/brains/:id/clone', requireAuthentication, asyncHandler((q, s) => brainController.clone(q, s)));
brainRouter.delete('/brains/:id', requireAuthentication, asyncHandler((q, s) => brainController.remove(q, s)));
