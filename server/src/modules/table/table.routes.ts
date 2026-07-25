import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { tableController } from './table.controller.js';

export const tableRouter = Router();
tableRouter.post('/tables', requireAuthentication, asyncHandler((req, res) => tableController.create(req, res)));
tableRouter.get('/tables', requireAuthentication, asyncHandler((req, res) => tableController.list(req, res)));
tableRouter.get('/tables/:id', requireAuthentication, asyncHandler((req, res) => tableController.getById(req, res)));
tableRouter.post('/tables/:id/seat', requireAuthentication, asyncHandler((req, res) => tableController.changeSeat(req, res)));
tableRouter.post('/tables/:id/cancel', requireAuthentication, asyncHandler((req, res) => tableController.cancel(req, res)));
tableRouter.post('/tables/:id/leave', requireAuthentication, asyncHandler((req, res) => tableController.leave(req, res)));
tableRouter.post('/tables/:id/start', requireAuthentication, asyncHandler((req, res) => tableController.start(req, res)));
