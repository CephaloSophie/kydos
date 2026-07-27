import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * SESSION — une exécution de jeu sur une Table.
 *  Table 1 ── N Session   (une table rejoue plusieurs sessions au fil du temps)
 *  Session 1 ── 1 Game    (chaque session produit exactement une partie)
 * La session porte l'état runtime (live) ; le Game porte le résultat persistant.
 */
const SessionSchema = new Schema(
  {
    table: { type: Schema.Types.ObjectId, ref: 'Table', required: true, index: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
    status: { type: String, enum: ['running', 'finished', 'aborted'], default: 'running', index: true },
    startedAt: { type: Date, default: () => new Date() },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type SessionAttributes = InferSchemaType<typeof SessionSchema>;
export const SessionModel = mongoose.models.Session ?? model('Session', SessionSchema);
