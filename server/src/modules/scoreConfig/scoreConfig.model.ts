import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * ScoreConfig — document SINGLETON (clé `default`) portant le modèle UNIQUE de
 * score & niveau Kýdos (barème de gain, échelle de niveaux, coefficients de
 * type de jeu). Édité au back-office, LU par le serveur de jeu au moment de
 * créditer le score en fin de partie. Voir belote-core `scoreKydos.ts` pour la
 * sémantique de chaque champ (source unique de vérité du calcul).
 */
const LevelOverrideSchema = new Schema(
  { level: { type: Number, required: true }, increment: { type: Number, required: true } },
  { _id: false },
);

const ScoreConfigSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true, index: true },
    /** Score de base d'un JOUEUR gagnant. */
    baseWinnerPlayer: { type: Number, default: 500 },
    /** Score de base d'un ROBOT gagnant. */
    baseWinnerRobot: { type: Number, default: 500 },
    /** Score cible pour franchir le premier niveau. */
    firstLevelThreshold: { type: Number, default: 500 },
    /** Pourcentage d'augmentation du seuil à chaque niveau. */
    levelUpPercent: { type: Number, default: 8 },
    /** Nombre de niveaux gérés (table pré-remplie). */
    maxLevel: { type: Number, default: 200 },
    /** Pourcentage des jetons accumulés converti en score (0 = désactivé). */
    tokenScorePercent: { type: Number, default: 0 },
    /** Bonus de score VIP (%) appliqué à tout gain d'un joueur VIP. */
    vipRate: { type: Number, default: 3 },
    /** Coefficient par type de jeu `${category}:${kind}` (défaut 1). */
    gameTypeCoefficients: { type: Schema.Types.Mixed, default: {} },
    /** Surcharges manuelles de l'échelle de niveaux. */
    levelOverrides: { type: [LevelOverrideSchema], default: [] },
  },
  { timestamps: true },
);

export type ScoreConfigAttributes = InferSchemaType<typeof ScoreConfigSchema>;
export const ScoreConfigModel = mongoose.models.ScoreConfig ?? model('ScoreConfig', ScoreConfigSchema);
