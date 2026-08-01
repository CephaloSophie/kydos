import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { promoController } from './promo.controller.js';

export const promoRouter = Router();
promoRouter.post('/promo/redeem', requireAuthentication, asyncHandler((req, res) => promoController.redeem(req, res)));
