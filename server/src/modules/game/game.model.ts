import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Sous-document : un PARTICIPANT (ligne d'un siège).
 * Embarqué dans le Game — écrit une fois, lu avec la partie. Pas de collection à part.
 */
const ParticipantSubSchema = new Schema(
  {
    seatIndex: { type: Number, required: true },
    team: { type: String, enum: ['A', 'B'], required: true },
    type: { type: String, enum: ['human', 'robot'], required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    robot: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    name: { type: String, default: '' },
    wasSubstitute: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * Sous-document : résumé léger d'une MANCHE (pour affichage/listing sans parser le replay).
 * Le détail rejouable exact reste dans `replay`.
 */
const MancheSubSchema = new Schema(
  {
    number: { type: Number, required: true },
    target: { type: Number, default: 0 },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    scoreTeamA: { type: Number, default: 0 },
    scoreTeamB: { type: Number, default: 0 },
  },
  { _id: false },
);

/**
 * GAME — AGRÉGAT (DDD) et frontière de cohérence, en UN SEUL document borné.
 * Idiome MongoDB : on EMBARQUE ce qui s'écrit/lit avec la partie (participants, manches),
 * on RÉFÉRENCE ce qui a un cycle de vie indépendant (table, session, owner, team).
 * Le déroulé volumineux (replay/logs) vit dans GameReplay (collection froide, 1:1).
 * Conséquence : persistance/lecture rapides ; document qui ne grossit pas dangereusement.
 * L'analyse/prédiction ne lit JAMAIS cette collection directement → voir ParticipationFact.
 */
const GameSchema = new Schema(
  {
    // Références (cycle de vie indépendant)
    table: { type: Schema.Types.ObjectId, ref: 'Table', default: null, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'Session', default: null, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },

    visibility: { type: String, enum: ['public', 'private', 'team'], default: 'private', index: true },
    mode: { type: String, enum: ['local', 'online', 'competition'], default: 'local' },
    target: { type: Number, default: 0 },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    finishedAt: { type: Date, default: () => new Date() },

    // Embarqués (cohérence avec la partie ; suffisent au listing sans charger le replay)
    participants: { type: [ParticipantSubSchema], default: [] },
    manches: { type: [MancheSubSchema], default: [] },

    /** Suivi de la projection analytique (CQRS) — rend le rebuild explicite et détectable. */
    projection: {
      status: { type: String, enum: ['pending', 'done', 'failed'], default: 'pending', index: true },
      version: { type: Number, default: 0 },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

export type GameAttributes = InferSchemaType<typeof GameSchema>;
export const GameModel = mongoose.models.Game ?? model('Game', GameSchema);
