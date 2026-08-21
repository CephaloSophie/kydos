/* =============================================================================
 * TOURNAMENTS · tournament.model.ts — Modèle bracket planifié (v14.12).
 * -----------------------------------------------------------------------------
 * Un `Tournament` est une compétition planifiée à bracket unique élimination
 * directe. Piliers v14.12 :
 *   • FORMAT       — l'un des 3 MatchFormat (duo/hybrid/royal).
 *   • CAPACITY     — 4 · 8 · 16 · 32 · 64 · 128 participants.
 *   • PRIZES BY POSITION — gains par rang final (1er, 2ᵉ, 3ᵉ ex æquo, 5ᵉ…).
 *                          Le back office peut aussi préciser un simple
 *                          `rounds[]` legacy (rétrocompat auto).
 *   • BRACKET TREE — arbre persistant mis à jour à chaque fin de match,
 *                    exposable pour visualisation « coupe du monde ».
 *
 * Cycle de vie via l'enum TournamentStatus :
 *   draft     — kydos seulement, invisible aux joueurs.
 *   upcoming  — publié, inscriptions ouvertes.
 *   live      — démarré : plus d'inscription/désinscription, bracket figé.
 *   finished  — terminé, écran résumé consultable, replays disponibles.
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

/* ── Prix par round (legacy v14.1) ────────────────────────────────────────── */

/** Gain distribué à chaque participant survivant à ce round. Legacy v14.1. */
const RoundPrizeSchema = new Schema(
  { round: { type: Number, required: true, min: 1 }, prize: { type: Number, required: true, min: 0 } },
  { _id: false },
);

/* ── Prix par position finale (v14.12) ────────────────────────────────────── */

/**
 * Prix distribué à CHAQUE occupant d'un rang final. Attention : dans un
 * bracket à élimination directe, un même rang peut être occupé par plusieurs
 * joueurs (2× 3ᵉ, 4× 5ᵉ, 8× 9ᵉ, etc.). Le back office doit définir des
 * positions correspondant aux « rangs uniques » du tableau `computePositions`
 * (voir bracket.ts).
 *
 * Exemple pour capacity=16 :
 *   [{position:1,prize:5000}, {position:2,prize:2000}, {position:3,prize:1000},
 *    {position:5,prize:400}, {position:9,prize:100}]
 *   → total payé = 5000 + 2000 + 2×1000 + 4×400 + 8×100 = 11 400 ◆.
 */
const PositionPrizeSchema = new Schema(
  { position: { type: Number, required: true, min: 1 }, prize: { type: Number, required: true, min: 0 } },
  { _id: false },
);

/* ── Participant ──────────────────────────────────────────────────────────── */

const ParticipantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    robotIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Robot' }], default: [] },
    /** Robot de secours (v14.5) : joue si l'humain quitte / dépasse le temps. */
    substituteRobotId: { type: Schema.Types.ObjectId, ref: 'Robot', default: null },
    seedIndex: { type: Number, default: null },
    eliminatedAtRound: { type: Number, default: null },
    /** v14.12 — Rang final réel (calculé à la fin du tournoi). */
    finalPosition: { type: Number, default: null },
    /** v14.12 — Prix effectivement versé (or 0 si aucune position rémunérée). */
    prizeAwarded: { type: Number, default: 0 },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

/* ── Bracket tree — arbre persistant (v14.12) ─────────────────────────────── */

/**
 * Un slot d'un match du bracket : c'est un participant identifié par userId
 * + son seedIndex initial + son display name (dénormalisé pour affichage).
 * Peut être null si le match n'est pas encore alimenté (les gagnants du round
 * précédent n'ont pas encore été déterminés).
 */
const BracketSlotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    seedIndex: { type: Number, default: null },
    displayName: { type: String, default: '' },
    // v14.14 — Carrée royale : 2ᵉ coéquipier de l'équipe occupant ce slot
    // (null pour les formats 1 vs 1 Duo/Hybrid où un slot = un seul joueur).
    userId2: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    displayName2: { type: String, default: '' },
  },
  { _id: false },
);

/**
 * Un nœud match du bracket. Contient :
 *   • matchIndex     — position dans le round (0-based).
 *   • matchId        — Match Mongo (créé quand le round démarre, null sinon).
 *   • gameId         — Game archivée (renseigné en fin de match).
 *   • slotA/slotB    — les 2 participants du match.
 *   • winner         — 'A' | 'B' | null.
 *   • scoreA/scoreB  — scores finaux (null tant que non joué).
 *   • startedAt/finishedAt — timings.
 *   • nextMatchIndex — index du match parent dans le round suivant.
 *   • nextSlot       — 'A' | 'B' où va le gagnant dans le nœud parent.
 */
const BracketMatchSchema = new Schema(
  {
    matchIndex: { type: Number, required: true, min: 0 },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', default: null },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
    slotA: { type: BracketSlotSchema, default: () => ({}) },
    slotB: { type: BracketSlotSchema, default: () => ({}) },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    scoreA: { type: Number, default: null },
    scoreB: { type: Number, default: null },
    // v17 — manches gagnées (best-of-N), score de progression MONOTONE.
    manchesA: { type: Number, default: null },
    manchesB: { type: Number, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    // v16 — instant planifié de démarrage (compte à rebours avant création).
    scheduledStartAt: { type: Date, default: null },
    nextMatchIndex: { type: Number, default: null },
    nextSlot: { type: String, enum: ['A', 'B', null], default: null },
  },
  { _id: false },
);

/** Un round : ses matchs + un label humain (« Huitièmes », « Finale »…). */
const BracketRoundSchema = new Schema(
  {
    roundIndex: { type: Number, required: true, min: 1 },
    label: { type: String, default: '' },
    matches: { type: [BracketMatchSchema], default: [] },
  },
  { _id: false },
);

const BracketTreeSchema = new Schema(
  {
    rounds: { type: [BracketRoundSchema], default: [] },
    builtAt: { type: Date, default: null },
    /** Dernier round dont TOUS les matchs sont finis (progression). */
    lastCompletedRound: { type: Number, default: 0 },
  },
  { _id: false },
);

/* ── Configuration de jeu du tournoi (v16) ─────────────────────────────────
 * Paramètres appliqués à CHAQUE match du tournoi, repris tels quels sur la
 * Table éphémère / la session de jeu (mêmes réglages qu'une table classique).
 * Permet au back-office de fixer le nombre de manches, le score cible, etc. */
const TournamentGameConfigSchema = new Schema(
  {
    manches: { type: Number, enum: [1, 2, 4], default: 2 },
    baseTarget: { type: Number, default: 1500 },   // score cible d'une manche standard
    labelTarget: { type: Number, default: 2000 },  // score cible du grand label
    // v17 — règles de belote configurables (voir TableConfigSchema).
    openingBidMin: { type: Number, default: 90 },  // score initial des enchères (minBid)
    countBelote: { type: Boolean, default: true }, // belote comptée dans le score ?
    clockwise: { type: Boolean, default: false },  // sens du jeu (true = horaire)
    // v19 — coefficient de SCORE appliqué à chaque match du tournoi (défaut 1).
    scoreCoefficient: { type: Number, default: 1 },
    // v16 — compte à rebours (s) avant le démarrage de chaque match/round.
    roundCountdownSec: { type: Number, default: 10 },
    // v16 — délai (s) avant la redirection auto du joueur depuis la popup LIVE.
    autoRejoinSec: { type: Number, default: 5 },
    trickDelayMs: { type: Number, default: 900 },
    speed: { type: Number, default: 1 },
    turnTimeoutMs: { type: Number, default: 15000 },
    allowSpectators: { type: Boolean, default: true },
    feltTheme: { type: String, enum: ['classic', 'cosmos', 'olympus'], default: 'classic' },
    // v18 — thème de table (bibliothèque back-office), appliqué à chaque match.
    tableThemeId: { type: Schema.Types.ObjectId, ref: 'TableTheme', default: null },
    signals: {
      reflexion: { type: Boolean, default: true },
      repeatSuit: { type: Boolean, default: true },
    },
  },
  { _id: false },
);

/* ── Schéma principal ─────────────────────────────────────────────────────── */

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    format: { type: String, enum: Object.values(MatchFormat), required: true, index: true },
    status: { type: String, enum: Object.values(TournamentStatus), default: TournamentStatus.DRAFT, index: true },
    capacity: { type: Number, enum: TOURNAMENT_CAPACITIES, required: true },

    /* v16 — Réglages de jeu appliqués aux matchs du tournoi. */
    gameConfig: { type: TournamentGameConfigSchema, default: () => ({}) },

    /* v14.12 — Habillage visuel & sémantique */
    description: { type: String, default: '', maxlength: 500 },
    color: { type: String, default: '#e6c46a' },   // hex CSS, affiché sur la carte
    icon: { type: String, default: '\u2666' },       // enseigne belote (♦♣♥♠) ou emoji court

    /* v14.12 — Critères d'accès */
    minLevel: { type: Number, default: 0, min: 0 },
    maxLevel: { type: Number, default: null },      // null = pas de plafond

    entryFee: { type: Number, required: true, min: 0 },

    /* v14.1 — Prix par round (legacy, conservé pour rétrocompat) */
    rounds: { type: [RoundPrizeSchema], default: [] },
    /* v14.12 — Prix par position finale (le nouveau standard) */
    prizesByPosition: { type: [PositionPrizeSchema], default: [] },

    startAt: { type: Date, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    participants: { type: [ParticipantSchema], default: [] },
    /** Ids des matchs joués, groupés par round : bracket[round-1] = Match[]. Legacy. */
    bracket: { type: [[Schema.Types.ObjectId]], default: [] },
    /** v14.12 — Arbre bracket persistant pour affichage « coupe du monde ». */
    bracketTree: { type: BracketTreeSchema, default: () => ({ rounds: [], lastCompletedRound: 0 }) },
    /** Top 3 final (userIds), rempli à la fin. */
    winners: { type: [Schema.Types.ObjectId], default: [] },

    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
TournamentSchema.index({ status: 1, startAt: 1 });
TournamentSchema.index({ status: 1, minLevel: 1 });   // filtrage rapide par niveau

export type TournamentAttributes = InferSchemaType<typeof TournamentSchema>;
export const TournamentModel = mongoose.models.Tournament ?? model('Tournament', TournamentSchema);

/* ── Contrainte 1 tournoi/robot/jour ──────────────────────────────────────── */

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
