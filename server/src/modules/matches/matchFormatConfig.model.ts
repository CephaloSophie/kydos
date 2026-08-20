/* =============================================================================
 * MATCHES · matchFormatConfig.model.ts — Config éditable des MATCH RAPIDE (v16).
 * -----------------------------------------------------------------------------
 * Le catalogue `MATCH_FORMAT_CATALOG` reste la source des règles STRUCTURELLES
 * d'un format (effectif, nombre de robots, headless…). Cette collection stocke
 * les paramètres ÉDITABLES par le back-office : mise (buy-in), gain, nombre de
 * manches, score cible, ainsi que l'habillage d'affichage (label, couleur,
 * icône, ordre, actif).
 *
 * v16 — PLUSIEURS VARIANTES par format sont autorisées (ex. deux « Duo d'acier »
 * à mises/niveaux différents). Chaque document = une variante identifiée par
 * son `_id`, qui sert de CLÉ DE FILE de matchmaking. `format` (non unique) donne
 * les règles STRUCTURELLES (effectif, headless…).
 * ========================================================================== */
import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';
import { MatchFormat } from './matchFormat.js';

const MatchFormatConfigSchema = new Schema(
  {
    format: { type: String, enum: Object.values(MatchFormat), required: true, index: true },
    label: { type: String, required: true },
    subtitle: { type: String, default: '' },
    /** Mise prélevée à chaque joueur (jetons). */
    buyInPerPlayer: { type: Number, required: true, min: 0 },
    /** Gain crédité au(x) vainqueur(s) (jetons). */
    prizePerWinner: { type: Number, required: true, min: 0 },
    /** Réglages de jeu appliqués au match. */
    manches: { type: Number, enum: [1, 2, 4], default: 2 },
    baseTarget: { type: Number, default: 1500 },
    labelTarget: { type: Number, default: 2000 },
    /** v17 — règles de belote configurables (voir TableConfigSchema). */
    openingBidMin: { type: Number, default: 90 },
    countBelote: { type: Boolean, default: true },
    clockwise: { type: Boolean, default: false },
    /** Habillage carte (mobile). */
    color: { type: String, default: '#3f6ea1' },
    icon: { type: String, default: '♦' },
    /** v18 — thème de table (bibliothèque back-office) appliqué au match. */
    tableThemeId: { type: Schema.Types.ObjectId, ref: 'TableTheme', default: null },
    /** v16 — Critère d'accès : niveau requis (min) et plafond (max, null = aucun). */
    minLevel: { type: Number, default: 0, min: 0 },
    maxLevel: { type: Number, default: null },
    /** v16 — délai (s) avant redirection auto depuis la popup LIVE. */
    autoRejoinSec: { type: Number, default: 5, min: 0 },
    /** Actif = proposé aux joueurs ; ordre d'affichage dans le carrousel. */
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type MatchFormatConfigAttributes = InferSchemaType<typeof MatchFormatConfigSchema>;
export const MatchFormatConfigModel =
  mongoose.models.MatchFormatConfig ?? model('MatchFormatConfig', MatchFormatConfigSchema);
