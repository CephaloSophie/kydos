/* =============================================================================
 * TOURNAMENTS · tournament.model.ts — Modèle bracket planifié.
 * -----------------------------------------------------------------------------
 * Un `Tournament` est une compétition planifiée à bracket unique élimination
 * directe. Trois piliers :
 *   • FORMAT       — l'un des 3 MatchFormat (duo/hybrid/royal).
 *   • CAPACITY     — 4 · 8 · 16 · 32 · 64 · 128 participants.
 *   • ROUNDS[]     — gains configurables par round (ex. quart 300, demi 500,
 *                    finale 1500). Renseignés à la création par kydos.
 *
 * Cycle de vie via l'enum TournamentStatus :
 *   draft     — kydos seulement, invisible aux joueurs.
 *   upcoming  — publié, inscriptions ouvertes.
 *   live      — démarré : plus d'inscription/désinscription, bracket figé,
 *               rounds enchaînés.
 *   finished  — terminé, écran résumé consultable, replays disponibles.
 *
 * Un tournoi référence des Match (via leur tournament + tournamentRound).
 * ========================================================================== */
import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';
import { MatchFormat } from '../matches/matchFormat.js';

export enum TournamentStatus {
  DRAFT = 'draft',
  UPCOMING = 'upcoming',
  LIVE = 'live',
  FINISHED = 'finished',
}

/** Capacités autorisées (puissances de 2 pour un bracket propre). */
export const TOURNAMENT_CAPACITIES = [4, 8, 16, 32, 64, 128] as const;
export type TournamentCapacity = (typeof TOURNAMENT_CAPACITIES)[number];

/** Gain distribué à chaque participant survivant à ce round. */
const RoundPrizeSchema = new Schema(
  {
    round: { type: Number, required: true, min: 1 },
    prize: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

/** Participant inscrit au tournoi. */
const ParticipantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    robotIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Robot' }], default: [] },
    seedIndex: { type: Number, default: null },
    eliminatedAtRound: { type: Number, default: null },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    format: { type: String, enum: Object.values(MatchFormat), required: true, index: true },
    status: { type: String, enum: Object.values(TournamentStatus), default: TournamentStatus.DRAFT, index: true },
    capacity: { type: Number, enum: TOURNAMENT_CAPACITIES, required: true },
    minLevel: { type: Number, default: 0, min: 0 },
    entryFee: { type: Number, required: true, min: 0 },
    rounds: { type: [RoundPrizeSchema], default: [] },
    startAt: { type: Date, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    participants: { type: [ParticipantSchema], default: [] },
    /** Ids des matchs joués, groupés par round : bracket[round-1] = Match[] */
    bracket: { type: [[Schema.Types.ObjectId]], default: [] },
    /** Top 3 final (userIds), rempli à la fin. */
    winners: { type: [Schema.Types.ObjectId], default: [] },

    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
TournamentSchema.index({ status: 1, startAt: 1 });

export type TournamentAttributes = InferSchemaType<typeof TournamentSchema>;
export const TournamentModel = mongoose.models.Tournament ?? model('Tournament', TournamentSchema);

/* ── Contrainte 1 tournoi/robot/jour ──────────────────────────────────────── */

/**
 * On garde une trace séparée « ce robot est inscrit ce jour-là dans un tournoi »
 * dans une collection dédiée avec un index unique {robotId, dayKey}. Plus
 * fiable que d'itérer sur tournois.participants à chaque inscription.
 */
const TournamentRobotDayLockSchema = new Schema(
  {
    robotId: { type: Schema.Types.ObjectId, ref: 'Robot', required: true },
    dayKey: { type: String, required: true },   // YYYY-MM-DD (UTC)
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);
TournamentRobotDayLockSchema.index({ robotId: 1, dayKey: 1 }, { unique: true });

export const TournamentRobotDayLockModel =
  mongoose.models.TournamentRobotDayLock ?? model('TournamentRobotDayLock', TournamentRobotDayLockSchema);

/** Clé de journée UTC (ex. '2026-08-09'). */
export function dayKeyUTC(date: Date): string { return date.toISOString().slice(0, 10); }
