import { UserModel } from '../user/user.model.js';
import { badRequest, notFound, unauthorized } from '../../core/HttpError.js';
import { DAILY_REWARD } from '../../shared/gameEconomy.js';

/** Jour ISO courant en UTC (YYYY-MM-DD) — jour de réclamation quotidienne. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const MAX_TRANSACTIONS = 200;

/** Serialize un porte-monnaie pour l'API. */
function serializeWallet(userDocument: any) {
  const wallet = userDocument.wallet ?? { tokens: 0, lastClaimDay: null, transactions: [] };
  return {
    balance: wallet.tokens,
    canClaimToday: wallet.lastClaimDay !== todayIso(),
    lastClaimDay: wallet.lastClaimDay,
    transactions: (wallet.transactions ?? []).slice(-50).map((t: any) => ({
      kind: t.kind, amount: t.amount, balance: t.balance, at: t.at, game: t.game ? String(t.game) : null,
    })),
  };
}

export class WalletService {
  /** Solde + capacité de réclamation quotidienne. */
  async getMyWallet(userId: string) {
    const userDocument = await UserModel.findById(userId);
    if (!userDocument) throw unauthorized('session expirée');
    return serializeWallet(userDocument);
  }

  /**
   * Débloque la récompense quotidienne (500 jetons).
   * Idempotent par jour (rejette si déjà réclamée).
   */
  async claimDaily(userId: string) {
    const day = todayIso();
    const userDocument = await UserModel.findById(userId);
    if (!userDocument) throw notFound();
    if (userDocument.wallet?.lastClaimDay === day) throw badRequest('déjà réclamée aujourd\'hui');
    const balance = (userDocument.wallet?.tokens ?? 0) + DAILY_REWARD;
    userDocument.wallet = userDocument.wallet ?? { tokens: 0, lastClaimDay: null, transactions: [] };
    userDocument.wallet.tokens = balance;
    userDocument.wallet.lastClaimDay = day;
    userDocument.wallet.transactions.push({ kind: 'daily', amount: DAILY_REWARD, balance, at: new Date() } as any);
    if (userDocument.wallet.transactions.length > MAX_TRANSACTIONS) {
      userDocument.wallet.transactions.splice(0, userDocument.wallet.transactions.length - MAX_TRANSACTIONS);
    }
    await userDocument.save();
    return { claimed: true, balance, reward: DAILY_REWARD };
  }

  /**
   * Prélève une mise à un utilisateur (utilisé au démarrage d'une partie
   * facturable). Refuse si le solde est insuffisant.
   */
  async stake(userId: string, amount: number, gameId?: string) {
    if (amount <= 0) throw badRequest('montant invalide');
    const userDocument = await UserModel.findById(userId);
    if (!userDocument) throw notFound();
    const currentBalance = userDocument.wallet?.tokens ?? 0;
    if (currentBalance < amount) throw badRequest('solde insuffisant');
    const balance = currentBalance - amount;
    userDocument.wallet = userDocument.wallet ?? { tokens: 0, lastClaimDay: null, transactions: [] };
    userDocument.wallet.tokens = balance;
    userDocument.wallet.transactions.push({ kind: 'game_stake', amount: -amount, balance, at: new Date(), game: gameId } as any);
    await userDocument.save();
    return { balance };
  }

  /** Crédite un gain à un utilisateur (fin de partie). */
  async credit(userId: string, amount: number, gameId?: string, kind: 'game_win' | 'refund' = 'game_win') {
    if (amount <= 0) return;
    const userDocument = await UserModel.findById(userId);
    if (!userDocument) throw notFound();
    const balance = (userDocument.wallet?.tokens ?? 0) + amount;
    userDocument.wallet = userDocument.wallet ?? { tokens: 0, lastClaimDay: null, transactions: [] };
    userDocument.wallet.tokens = balance;
    userDocument.wallet.transactions.push({ kind, amount, balance, at: new Date(), game: gameId } as any);
    await userDocument.save();
  }
}

export const walletService = new WalletService();
