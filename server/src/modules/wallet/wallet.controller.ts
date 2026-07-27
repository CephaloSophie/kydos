import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { walletService } from './wallet.service.js';

export class WalletController {
  async getMine(request: AuthenticatedRequest, response: Response) {
    response.json(await walletService.getMyWallet(request.userId!));
  }
  async claimDaily(request: AuthenticatedRequest, response: Response) {
    response.json(await walletService.claimDaily(request.userId!));
  }
}

export const walletController = new WalletController();
