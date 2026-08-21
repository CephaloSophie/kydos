import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Transaction du porte-monnaie de l'utilisateur (append-only).
 * kind :
 *   - 'daily'      : récompense quotidienne débloquée (crédit)
 *   - 'game_stake' : mise prélevée à l'entrée d'une partie (débit)
 *   - 'game_win'   : gain versé en fin de partie (crédit)
 *   - 'refund'     : remboursement (annulation d'une partie pending)
 */
const WalletTransactionSchema = new Schema(
  {
    kind: { type: String, enum: ['daily', 'game_stake', 'game_win', 'refund', 'promo', 'vip'], required: true },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
    at: { type: Date, default: () => new Date(), index: true },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null, index: true, sparse: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'banned'], default: 'user', index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    settings: {
      responseTimeMs: { type: Number, default: 1000 },
      maxPlayTimeMs: { type: Number, default: 10000 },
      defaultManches: { type: Number, default: 2 },
    },
    /**
     * Score cumulé Kýdos (modèle UNIQUE, voir belote-core `scoreKydos`).
     * `rewardPoints` = score total à vie ; `level` et `scoreInLevel` en sont
     * dérivés et rafraîchis à chaque gain (source unique : gamePersistence).
     */
    rewardPoints: { type: Number, default: 0 },
    /** Niveau courant (dérivé du score via l'échelle back-office). */
    level: { type: Number, default: 1 },
    /** Points accumulés DANS le niveau courant. */
    scoreInLevel: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    /**
     * Économie serveur.
     * `wallet.tokens` : solde courant (jamais négatif).
     * `wallet.lastClaimDay` : jour ISO (YYYY-MM-DD) de la dernière réclamation quotidienne.
     * `wallet.transactions` : journal borné (200 dernières entrées).
     */
    wallet: {
      tokens: { type: Number, default: 0 },
      lastClaimDay: { type: String, default: null },
      transactions: { type: [WalletTransactionSchema], default: [] },
    },
    /**
     * Session ACTIVE — si non-null, l'utilisateur EST engagé dans une partie
     * (en cours ou pending). Le service `singleGameLock` en interdit une autre.
     */
    activeSession: { type: Schema.Types.ObjectId, ref: 'Session', default: null, index: true },
    /** Robot désigné comme favori — reprend la main si l'utilisateur quitte. */
    favoriteRobot: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    /** Statut VIP : date d'expiration (null = non VIP). Le service compare > now(). */
    vipExpiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export type UserAttributes = InferSchemaType<typeof UserSchema>;
export type WalletTransactionAttributes = InferSchemaType<typeof WalletTransactionSchema>;
export const UserModel = mongoose.models.User ?? model('User', UserSchema);
