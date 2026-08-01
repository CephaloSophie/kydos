import { PromoCodeModel } from './promo.model.js';
import { UserModel } from '../user/user.model.js';
import { badRequest, notFound } from '../../core/HttpError.js';

/* =============================================================================
 * PromoService — validation & utilisation des codes de rechargement.
 * -----------------------------------------------------------------------------
 * Toute la logique métier : normalisation (retrait des tirets/espaces),
 * contrôle du format 12 chiffres, expiration, quota, anti-rejeu par personne,
 * puis crédit du porte-monnaie de façon cohérente (transaction wallet).
 * ========================================================================== */

const MAX_TRANSACTIONS = 200;

/** Retire tout sauf les chiffres (l'UI insère des tirets à l'affichage). */
export function normalizeCode(raw: string): string {
  return (raw ?? '').replace(/\D/g, '');
}

/** Valide le format : exactement 12 chiffres. */
export function isValidFormat(code: string): boolean {
  return /^\d{12}$/.test(code);
}

export class PromoService {
  /**
   * Utilise un code pour l'utilisateur donné : crédite ses jetons si le code est
   * valide, non expiré, sous quota et jamais utilisé par cet utilisateur.
   * @returns le nouveau solde et le montant crédité
   */
  async redeem(userId: string, rawCode: string): Promise<{ tokens: number; balance: number }> {
    const code = normalizeCode(rawCode);
    if (!isValidFormat(code)) throw badRequest('Code invalide : 12 chiffres attendus.');

    const promo = await PromoCodeModel.findOne({ code });
    if (!promo) throw badRequest('Code inconnu.');
    if (!promo.active) throw badRequest('Code désactivé.');
    if (promo.expiresAt.getTime() <= Date.now()) throw badRequest('Code expiré.');
    if (promo.redeemedBy.length >= promo.maxRedemptions) throw badRequest('Code déjà épuisé.');
    if (promo.redeemedBy.some((id) => String(id) === userId)) throw badRequest('Vous avez déjà utilisé ce code.');

    const userDocument = await UserModel.findById(userId);
    if (!userDocument) throw notFound();

    // Crédit du porte-monnaie (même journal que les autres crédits).
    const balance = (userDocument.wallet?.tokens ?? 0) + promo.tokens;
    userDocument.wallet = userDocument.wallet ?? { tokens: 0, lastClaimDay: null, transactions: [] };
    userDocument.wallet.tokens = balance;
    userDocument.wallet.transactions.push({ kind: 'promo', amount: promo.tokens, balance, at: new Date(), game: null } as any);
    if (userDocument.wallet.transactions.length > MAX_TRANSACTIONS) {
      userDocument.wallet.transactions.splice(0, userDocument.wallet.transactions.length - MAX_TRANSACTIONS);
    }
    await userDocument.save();

    // Marque le code comme utilisé par cet utilisateur (anti-rejeu).
    promo.redeemedBy.push(userDocument._id);
    await promo.save();

    return { tokens: promo.tokens, balance };
  }

  /**
   * Crée un code (usage admin / seed). Le code doit être 12 chiffres uniques.
   * @param durationDays validité (jours) à partir de maintenant
   */
  async create(input: { code: string; tokens: number; durationDays: number; maxRedemptions?: number; label?: string }) {
    const code = normalizeCode(input.code);
    if (!isValidFormat(code)) throw badRequest('Le code doit comporter 12 chiffres.');
    if (input.tokens <= 0) throw badRequest('Montant de jetons invalide.');
    if (input.durationDays <= 0) throw badRequest('Durée de validité invalide.');
    const expiresAt = new Date(Date.now() + input.durationDays * 86_400_000);
    return PromoCodeModel.create({
      code, tokens: input.tokens, expiresAt,
      maxRedemptions: input.maxRedemptions ?? 1, label: input.label ?? '',
    });
  }
}

export const promoService = new PromoService();
