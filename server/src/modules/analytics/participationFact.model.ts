import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * PARTICIPATION_FACT — modèle de LECTURE dénormalisé (CQRS), granularité = donne × siège.
 * Append-only, jamais mis à jour, dérivé de l'agrégat Game (rebuild possible à tout moment).
 * C'est ICI que vit la « liaison » joueur/robot ↔ donne ↔ partie : côté lecture, pas côté écriture.
 * Tout le contexte est inline → aucune jointure, agrégations rapides pour l'analyse/prédiction.
 */
const ParticipationFactSchema = new Schema(
  {
    // Dimensions d'identité
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    participantType: { type: String, enum: ['human', 'robot'], required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    robot: { type: Schema.Types.ObjectId, ref: 'Robot', default: null, index: true },
    seatIndex: { type: Number, required: true },
    team: { type: String, enum: ['A', 'B'], required: true },

    // Dimensions de contexte (dénormalisées)
    mancheNumber: { type: Number, required: true },
    donneNumber: { type: Number, required: true },
    trump: { type: String, default: null },
    contract: { type: Number, default: null },
    contre: { type: String, default: 'none' },

    // Mesures (faits)
    wasBidder: { type: Boolean, default: false },
    wasSubstitute: { type: Boolean, default: false },
    pointsTeam: { type: Number, default: 0 },
    pointsOpponent: { type: Number, default: 0 },
    wonDonne: { type: Boolean, default: false },
    wonManche: { type: Boolean, default: false },
    wonGame: { type: Boolean, default: false },

    playedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false },
);
// Index pensés pour les requêtes d'analyse (par robot/joueur, et par preneur).
ParticipationFactSchema.index({ robot: 1, wasBidder: 1 });
ParticipationFactSchema.index({ user: 1, wasBidder: 1 });

export type ParticipationFactAttributes = InferSchemaType<typeof ParticipationFactSchema>;
export const ParticipationFactModel = mongoose.models.ParticipationFact ?? model('ParticipationFact', ParticipationFactSchema);
