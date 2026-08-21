import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

const RobotSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    personality: {
      aggressiveness: { type: Number, default: 5 },
      concentration: { type: Number, default: 5 },
      velocity: { type: Number, default: 5 },
    },
    responseTimeMs: { type: Number, default: 1000 },
    maxPlayTimeMs: { type: Number, default: 10000 },
    /** Délai de réponse à l'annonce — fixe, non modifiable par l'utilisateur. */
    bidResponseMs: { type: Number, default: 700 },
    conventionConfig: { type: Schema.Types.Mixed, default: {} },
    algoSpec: { type: Schema.Types.Mixed, default: null },
    /**
     * Score cumulé Kýdos du robot (modèle UNIQUE, voir belote-core `scoreKydos`).
     * `score` = total à vie ; `level` / `scoreInLevel` en sont dérivés et
     * rafraîchis à chaque gain (source unique : gamePersistence).
     */
    score: { type: Number, default: 0 },
    /** Niveau courant du robot (dérivé du score via l'échelle back-office). */
    level: { type: Number, default: 1 },
    /** Points accumulés DANS le niveau courant. */
    scoreInLevel: { type: Number, default: 0 },
    offlineEnabled: { type: Boolean, default: false },
    representativeSlot: { type: Number, default: 0 },
    /**
     * Métadonnées d'AFFICHAGE de l'application mobile (avatar + curseurs bruts).
     * Purement présentationnel : aucun effet sur le moteur, dont le comportement
     * reste piloté par `personality`. Voir docs/ai/MOBILE.md.
     */
    mobile: {
      avatarId: { type: String, default: 'atne' },
      strategy: {
        aggro: { type: Number, default: 50 },
        risk: { type: Number, default: 50 },
        bluff: { type: Number, default: 50 },
        memoire: { type: Number, default: 50 },
      },
    },
  },
  { timestamps: true },
);

export type RobotAttributes = InferSchemaType<typeof RobotSchema>;
export const RobotModel = mongoose.models.Robot ?? model('Robot', RobotSchema);
