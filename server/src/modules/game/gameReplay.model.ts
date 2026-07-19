import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * GAME_REPLAY — données FROIDES et volumineuses du déroulé (replay rejouable + logs).
 * Séparées de l'agrégat Game pour garder ce dernier petit et rapide à lister/charger.
 *  Relation 1:1 : `_id` du replay == `_id` du Game (zéro index supplémentaire, lookup direct).
 * Chargé uniquement quand on rejoue réellement une partie.
 */
const GameReplaySchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    replay: { type: Schema.Types.Mixed, required: true },
    logs: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true, _id: false },
);

export type GameReplayAttributes = InferSchemaType<typeof GameReplaySchema>;
export const GameReplayModel = mongoose.models.GameReplay ?? model('GameReplay', GameReplaySchema);
