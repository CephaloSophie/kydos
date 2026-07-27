import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { walletController } from './wallet.controller.js';

export const walletRouter = Router();
walletRouter.get('/wallet', requireAuthentication, asyncHandler((req, res) => walletController.getMine(req, res)));
walletRouter.post('/wallet/claim', requireAuthentication, asyncHandler((req, res) => walletController.claimDaily(req, res)));
