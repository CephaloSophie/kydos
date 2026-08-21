/* =============================================================================
 * TABLE-THEME · tableTheme.model.ts — Bibliothèque de thèmes de table (v18).
 * -----------------------------------------------------------------------------
 * Un thème est une entité RÉUTILISABLE, référencée par son `_id` depuis les
 * tournois et les variantes de MATCH RAPIDE. Le back-office les gère (CRUD) ;
 * le serveur de jeu les résout en couleurs concrètes au provisionnement de la
 * table live. Les thèmes `builtIn` (presets historiques) ne sont pas
 * supprimables.
 * ========================================================================== */
import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

const TableThemeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    /** Slug stable pour les presets intégrés (classic/acier/…) ; null sinon. */
    key: { type: String, default: null, index: true },
    /** Preset intégré : visible partout, non supprimable. */
    builtIn: { type: Boolean, default: false, index: true },
    /** Couleurs « métier » saisies par l'admin. */
    feltColor: { type: String, required: true },       // centre du tapis
    feltEdgeColor: { type: String, default: null },    // bords (dégradé) ; null = auto
    railColor: { type: String, required: true },       // bordure / rail
    accentColor: { type: String, default: null },      // liseré / or ; null = auto
    // v18 — dos des cartes (dégradé haut/bas) ; null = indigo par défaut.
    cardBackColor: { type: String, default: null },
    cardBackColor2: { type: String, default: null },
    active: { type: Boolean, default: true, index: true },
    /** v18 — cycle de vie éditorial : brouillon → prêt → publié. */
    status: { type: String, enum: ['draft', 'pending', 'active'], default: 'active', index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type TableThemeAttributes = InferSchemaType<typeof TableThemeSchema>;
export const TableThemeModel =
  mongoose.models.TableTheme ?? model('TableTheme', TableThemeSchema);
