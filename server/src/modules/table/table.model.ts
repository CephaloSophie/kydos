import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Un SIÈGE d'une table : vide, humain, ou robot.
 * Sous-document embarqué (un siège n'existe pas hors de sa table).
 */
const SeatSchema = new Schema(
  {
    index: { type: Number, required: true },
    kind: { type: String, enum: ['empty', 'human', 'robot'], default: 'empty' },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    robot: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: '' },
  },
  { _id: false },
);

/**
 * Configuration RÉUTILISABLE d'une table de jeu — le « contexte » qu'on peut
 * instancier n'importe où (entraînement, salle, compétition, événement).
 * C'est la source de vérité de tout ce qui est paramétrable.
 */
const TableConfigSchema = new Schema(
  {
    manches: { type: Number, default: 2 },
    trickDelayMs: { type: Number, default: 900 },
    speed: { type: Number, default: 1 },
    gameType: { type: String, default: 'contree' },
    maxPlayers: { type: Number, default: 4 },
    allowSpectators: { type: Boolean, default: true },
    feltTheme: { type: String, enum: ['classic', 'cosmos', 'olympus'], default: 'classic' },
    turnTimeoutMs: { type: Number, default: 10000 },
    surcoincheWindowMs: { type: Number, default: 3500 },
    notifyMs: { type: Number, default: 5000 },
    atoutGlyphOpacity: { type: Number, default: 0.06 },
    /** Signaux d'enchère activés à cette table (initialisés à la création). */
    signals: {
      reflexion: { type: Boolean, default: true },
      repeatSuit: { type: Boolean, default: true },
    },
  },
  { _id: false },
);

/**
 * TABLE de jeu persistée — appartient à un joueur ou à une équipe.
 * Cycle de vie : lobby · playing · finished · draft.
 * Une table peut générer plusieurs Sessions au fil du temps.
 */
const TableSchema = new Schema(
  {
    status: { type: String, enum: ['lobby', 'playing', 'finished', 'draft'], default: 'lobby', index: true },
    ownerType: { type: String, enum: ['user', 'team'], required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    visibility: { type: String, enum: ['public', 'private'], default: 'private', index: true },
    /** Contexte de jeu — utilisé pour instancier le module Table côté front. */
    config: { type: TableConfigSchema, default: () => ({}) },
    seats: { type: [SeatSchema], default: [] },
    /** Session active (la partie en cours), si la table joue. */
    activeSession: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    startsAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true },
);
TableSchema.index({ status: 1, visibility: 1, lastActivityAt: -1 });
TableSchema.index({ status: 1, team: 1 });

export type SeatAttributes = InferSchemaType<typeof SeatSchema>;
export type TableConfigAttributes = InferSchemaType<typeof TableConfigSchema>;
export type TableAttributes = InferSchemaType<typeof TableSchema>;
export const TableModel = mongoose.models.Table ?? model('Table', TableSchema);
