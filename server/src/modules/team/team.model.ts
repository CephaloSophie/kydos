import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Rôles au sein d'une équipe (autorité décroissante).
 * Contrat :
 *   - `owner` : plein pouvoir (rename, kick, promotion, dissolution). Un et un seul.
 *   - `super` : peut renommer et gérer (kick/promotion) `admin` et `user`.
 *   - `admin` : peut gérer (kick/promotion) `user`.
 *   - `user`  : peut jouer, regarder, entrer comme spectateur.
 * Les hiérarchies sont vérifiées par TeamService (voir permissions.ts).
 */
export const TEAM_ROLES = ['owner', 'super', 'admin', 'user'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

/** Capacité maximale d'une équipe — règle produit non-négociable. */
export const TEAM_MAX_MEMBERS = 40;

/**
 * Membre d'équipe (sous-document embarqué sur Team).
 * On embarque plutôt qu'utiliser une collection à part : la liste est bornée
 * (40 max), on la lit et l'écrit toujours avec l'équipe, et un utilisateur
 * peut être membre de plusieurs équipes (`User.team` reste sa SEULE équipe
 * *possédée* — le champ « joined » est ici, côté équipe).
 */
const TeamMemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: TEAM_ROLES, required: true, default: 'user' },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    /** Le propriétaire (rôle `owner`) — indexé pour la règle « une équipe possédée max ». */
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    points: { type: Number, default: 0 },
    visibility: { type: String, enum: ['public', 'private'], default: 'private', index: true },
    /**
     * Liste bornée des membres (max TEAM_MAX_MEMBERS).
     * Contient TOUJOURS le propriétaire (invariant maintenu par le service).
     */
    members: { type: [TeamMemberSchema], default: [] },
  },
  { timestamps: true },
);

/** Un utilisateur ne peut posséder qu'une seule équipe. */
TeamSchema.index({ owner: 1 }, { unique: true });

export type TeamAttributes = InferSchemaType<typeof TeamSchema>;
export type TeamMemberAttributes = InferSchemaType<typeof TeamMemberSchema>;
export const TeamModel = mongoose.models.Team ?? model('Team', TeamSchema);
