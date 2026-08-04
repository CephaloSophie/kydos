import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { walletService } from './wallet.service.js';
import { badRequest } from '../../core/HttpError.js';

/** Barème VIP (source de vérité serveur, aligné sur le mobile VipService). */
const VIP_PLANS: Record<string, { id: string; costTokens: number; durationDays: number }> = {
  day:    { id: 'day',    costTokens: 600,   durationDays: 1 },
  days10: { id: 'days10', costTokens: 4500,  durationDays: 10 },
  days30: { id: 'days30', costTokens: 30000, durationDays: 30 },
};

export class WalletController {
  async getMine(request: AuthenticatedRequest, response: Response) {
    response.json(await walletService.getMyWallet(request.userId!));
  }
  async claimDaily(request: AuthenticatedRequest, response: Response) {
    response.json(await walletService.claimDaily(request.userId!));
  }
  /** GET /wallet/vip — statut VIP courant. */
  async getVip(request: AuthenticatedRequest, response: Response) {
    response.json(await walletService.getVipStatus(request.userId!));
  }
  /** POST /wallet/vip — achat/prolongation VIP. Corps: { planId }. */
  async purchaseVip(request: AuthenticatedRequest, response: Response) {
    const { planId } = request.body as { planId?: string };
    const plan = planId ? VIP_PLANS[planId] : undefined;
    if (!plan) throw badRequest('plan VIP inconnu');
    response.json(await walletService.purchaseVip(request.userId!, plan));
  }
}

export const walletController = new WalletController();
