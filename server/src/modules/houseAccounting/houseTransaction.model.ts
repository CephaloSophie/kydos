/* =============================================================================
 * HOUSE_ACCOUNTING · houseTransaction.model.ts — Comptabilité kydos.
 * -----------------------------------------------------------------------------
 * Une entrée par gain (ou perte) de la maison sur un match ou un tournoi.
 * Permet un reporting simple :
 *   houseTransactionModel.aggregate([{ $group: { _id: '$kind', total: { $sum: '$amount' } } }])
 *
 * Le montant est SIGNÉ : positif = kydos gagne, négatif = kydos perd (peut
 * arriver sur un tournoi mal calibré — le back office affichera un warning à la
 * publication).
 * ========================================================================== */
import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

export enum HouseTransactionKind {
  MATCH_RAKE = 'match_rake',
  TOURNAMENT_ENTRY = 'tournament_entry',    // buy-in collecté à l'inscription
  TOURNAMENT_PRIZE = 'tournament_prize',    // gain versé à un joueur (négatif pour kydos)
}

const HouseTransactionSchema = new Schema(
  {
    kind: { type: String, enum: Object.values(HouseTransactionKind), required: true, index: true },
    amount: { type: Number, required: true },   // signé : + = kydos gagne, − = kydos perd
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', default: null, index: true },
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
    round: { type: Number, default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);
HouseTransactionSchema.index({ kind: 1, createdAt: -1 });

export type HouseTransactionAttributes = InferSchemaType<typeof HouseTransactionSchema>;
export const HouseTransactionModel = mongoose.models.HouseTransaction ?? model('HouseTransaction', HouseTransactionSchema);
