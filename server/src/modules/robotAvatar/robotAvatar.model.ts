/* =============================================================================
 * ROBOT-AVATAR · robotAvatar.model.ts — Catalogue d'avatars de robots (v18).
 * -----------------------------------------------------------------------------
 * Un avatar est une variante de couleur de la mascotte robot, débloquée sur
 * une plage de NIVEAU joueur [minLevel, maxLevel]. Le catalogue est géré au
 * back-office et servi à l'app mobile (plus AUCUN avatar codé en dur côté
 * mobile). Collection INDÉPENDANTE.
 * ========================================================================== */
import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

const RobotAvatarSchema = new Schema(
  {
    /** Slug stable (référencé par `robot.mobile.avatarId`). */
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    /** Couleur d'accent de la mascotte (yeux / antenne / bulbe). */
    accentColor: { type: String, required: true },
    /** v18 — paramètres de design de la mascotte (SVG paramétrique).
     *  bodyColor = plaques du corps ; outlineColor = bordure/contour.
     *  null = dérivé automatiquement de accentColor (clair / foncé). */
    bodyColor: { type: String, default: null },
    outlineColor: { type: String, default: null },
    /** Plage de niveau joueur où l'avatar est proposé (maxLevel null = ∞). */
    minLevel: { type: Number, default: 0, min: 0 },
    maxLevel: { type: Number, default: null },
    /** Preset intégré : non supprimable. */
    builtIn: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    status: { type: String, enum: ['draft', 'pending', 'active'], default: 'active', index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type RobotAvatarAttributes = InferSchemaType<typeof RobotAvatarSchema>;
export const RobotAvatarModel =
  mongoose.models.RobotAvatar ?? model('RobotAvatar', RobotAvatarSchema);
