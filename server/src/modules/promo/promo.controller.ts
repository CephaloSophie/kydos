import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { promoService } from './promo.service.js';

/** Contrôleur des codes promotionnels (rechargement de jetons). */
export const promoController = {
  /** POST /promo/redeem — utilise un code pour l'utilisateur courant. */
  async redeem(request: AuthenticatedRequest, response: Response) {
    const { code } = request.body as { code?: string };
    const result = await promoService.redeem(request.userId!, code ?? '');
    response.json(result);
  },
};
