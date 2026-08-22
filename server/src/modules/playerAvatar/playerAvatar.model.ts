import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * PlayerAvatar — catalogue de LOGOS pour les joueurs humains. Même rendu que les
 * mascottes robots (mascotte paramétrique teintée), mais collection INDÉPENDANTE :
 * ce sont des logos proposés aux humains, gérés au back-office, sans niveau requis
 * (choix libre). Un joueur en choisit un dans son profil (`User.avatarId`).
 */
const PlayerAvatarSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    accentColor: { type: String, required: true },
    bodyColor: { type: String, default: null },
    outlineColor: { type: String, default: null },
    builtIn: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    status: { type: String, enum: ['draft', 'pending', 'active'], default: 'active', index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type PlayerAvatarAttributes = InferSchemaType<typeof PlayerAvatarSchema>;
export const PlayerAvatarModel = mongoose.models.PlayerAvatar ?? model('PlayerAvatar', PlayerAvatarSchema);
