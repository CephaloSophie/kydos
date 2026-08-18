/* =============================================================================
 * MATCHES · match.model.ts — Modèle unifié pour les 3 formats.
 * -----------------------------------------------------------------------------
 * Un `Match` représente une partie compétitive (par opposition à une partie
 * libre créée par un joueur). Trois formats via l'enum MatchFormat.
 *
 * Cycle de vie :
 *   queued    → tickets dans la file, en attente du complément d'effectif
 *   pairing   → effectif complet, préparation de la table (bref, transitoire)
 *   running   → la partie tourne (headless pour DUO_STEEL, temps réel pour les autres)
 *   finished  → terminée, résultat + game référencés
 *   cancelled → annulée avant démarrage (par un joueur qui quitte la file)
 * ========================================================================== */
import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';
import { MatchFormat } from './matchFormat.js';

export enum MatchStatus {
  QUEUED = 'queued',
  PAIRING = 'pairing',
  RUNNING = 'running',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

/** Un participant humain ou robot (sièges 0..3). */
const ParticipantSchema = new Schema(
  {
    seat: { type: Number, required: true, min: 0, max: 3 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    robotId: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    /**
     * v14.5 — Robot désigné pour prendre la main si le joueur humain se
     * déconnecte ou dépasse le temps imparti. Renseigné uniquement pour les
     * participants humains (isHuman=true) des formats HYBRID/ROYAL.
     */
    substituteRobotId: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    team: { type: String, enum: ['A', 'B'], required: true },
    isHuman: { type: Boolean, required: true },
  },
  { _id: false },
);

const MatchSchema = new Schema(
  {
    format: { type: String, enum: Object.values(MatchFormat), required: true, index: true },
    status: { type: String, enum: Object.values(MatchStatus), default: MatchStatus.QUEUED, index: true },

    /**
     * v16 — Variante de MATCH RAPIDE (MatchFormatConfig) dont ce match est
     * issu : sa mise/gain/manches/score sont ceux appliqués et versés. `null`
     * pour un match de tournoi (économie gérée par le tournoi) ou legacy.
     */
    formatConfig: { type: Schema.Types.ObjectId, ref: 'MatchFormatConfig', default: null, index: true },

    participants: { type: [ParticipantSchema], default: [] },

    /** Tournoi parent (null pour un match libre). */
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
    tournamentRound: { type: Number, default: null },

    /** Ref au Game archivé (rempli à la fin). */
    game: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
    /** Ref à la Table éphémère créée pour les formats non-headless (v14.4). */
    liveTableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null },
    winnerTeam: { type: String, enum: ['A', 'B', null], default: null },
    scoreTeamA: { type: Number, default: 0 },
    scoreTeamB: { type: Number, default: 0 },

    queuedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
MatchSchema.index({ status: 1, format: 1, createdAt: -1 });
MatchSchema.index({ tournament: 1, tournamentRound: 1 });

export type MatchAttributes = InferSchemaType<typeof MatchSchema>;
export const MatchModel = mongoose.models.Match ?? model('Match', MatchSchema);
