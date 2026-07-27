import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * COMPETITION_TABLE — affrontement de robots, joué 100% en backend.
 * Cycle de vie :
 *   open      → créée par un propriétaire avec 2 robots, en attente d'un challenger
 *   running   → un challenger a rejoint avec ses 2 robots ; match mis en file et joué
 *   finished  → partie terminée ; résultat + référence Game
 *   cancelled → annulée par le propriétaire tant qu'elle est open
 * Équipes : robots du propriétaire = équipe A (sièges 0,2) ; robots du challenger = équipe B (sièges 1,3).
 */
const CompetitionTableSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerRobots: { type: [{ type: Schema.Types.ObjectId, ref: 'Robot' }], default: [] },

    challenger: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    challengerRobots: { type: [{ type: Schema.Types.ObjectId, ref: 'Robot' }], default: [] },

    visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
    status: { type: String, enum: ['open', 'running', 'finished', 'cancelled'], default: 'open', index: true },
    config: {
      manches: { type: Number, default: 2 },
    },

    // Résultat (rempli à la fin) — dénormalisé pour l'affichage sans charger le Game.
    game: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    scoreTeamA: { type: Number, default: 0 },
    scoreTeamB: { type: Number, default: 0 },

    queuedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
CompetitionTableSchema.index({ status: 1, visibility: 1, createdAt: -1 });

export type CompetitionTableAttributes = InferSchemaType<typeof CompetitionTableSchema>;
export const CompetitionTableModel = mongoose.models.Competition ?? model('Competition', CompetitionTableSchema);
