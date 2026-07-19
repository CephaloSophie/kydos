import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { analyticsController } from './analytics.controller.js';

export const analyticsRouter = Router();
analyticsRouter.get('/analytics/me', requireAuthentication, asyncHandler((req, res) => analyticsController.myStats(req, res)));
analyticsRouter.get('/analytics/robots/:id', requireAuthentication, asyncHandler((req, res) => analyticsController.robotStats(req, res)));
analyticsRouter.post('/analytics/rebuild', requireAuthentication, asyncHandler((req, res) => analyticsController.rebuild(req, res)));
