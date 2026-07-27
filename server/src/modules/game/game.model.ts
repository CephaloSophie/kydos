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
 * Sous-document : STATISTIQUES détaillées d'une partie (SPEC §3.10). Dérivées du
 * replay au moment de la persistance, embarquées ici pour un affichage rapide du
 * tableau d'historique détaillé (résultats, plis, contrées, capots...).
 */
const StatsSubSchema = new Schema(
  {
    totalDonnes: { type: Number, default: 0 },
    totalTricksA: { type: Number, default: 0 },
    totalTricksB: { type: Number, default: 0 },
    contres: { type: Number, default: 0 },
    surcontres: { type: Number, default: 0 },
    contresReussies: { type: Number, default: 0 },
    capotsA: { type: Number, default: 0 },
    capotsB: { type: Number, default: 0 },
    capotsTotal: { type: Number, default: 0 },
    capotsAnnoncesA: { type: Number, default: 0 },
    capotsAnnoncesB: { type: Number, default: 0 },
    capotsAnnoncesTotal: { type: Number, default: 0 },
    belotesA: { type: Number, default: 0 },
    belotesB: { type: Number, default: 0 },
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
    /** Type de partie en ligne (SPEC §3.3), pour les filtres d'historique. */
    kind: { type: String, enum: ['hybride', 'acier', 'royal', 'local'], default: 'local', index: true },
    target: { type: Number, default: 0 },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    finishedAt: { type: Date, default: () => new Date() },

    // Embarqués (cohérence avec la partie ; suffisent au listing sans charger le replay)
    participants: { type: [ParticipantSubSchema], default: [] },
    manches: { type: [MancheSubSchema], default: [] },

    /** Score final de la partie (pour affichage direct dans l'historique). */
    finalScoreA: { type: Number, default: 0 },
    finalScoreB: { type: Number, default: 0 },
    /** Manches gagnées par équipe. */
    manchesWonA: { type: Number, default: 0 },
    manchesWonB: { type: Number, default: 0 },
    /** Statistiques détaillées (plis, contrées, capots...). */
    stats: { type: StatsSubSchema, default: () => ({}) },

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
