/* =============================================================================
 * MODULE · users/user.model.ts — Utilisateurs du backoffice Bord.
 * -----------------------------------------------------------------------------
 * Seulement 2 comptes seed (ameur, hamido). Mot de passe stocké en bcrypt.
 * Pas d'inscription publique — la création se fait via le script de seed.
 * ========================================================================== */
import mongoose, { Schema } from 'mongoose';

export interface BordUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  displayName: string;
  passwordHash: string;
  role: 'admin' | 'editor';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<BordUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor'], default: 'editor' },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<BordUser>('BordUser', UserSchema);
