import bcrypt from 'bcryptjs';
import { UserModel } from '../users/user.model.js';
import { signToken } from '../../shared/authentication.js';
import { badRequest, unauthorized } from '../../core/HttpError.js';

export const authService = {
  /** Authentifie un utilisateur et renvoie un token. */
  async login(username: string, password: string) {
    if (!username || !password) throw badRequest('identifiants manquants');
    const user = await UserModel.findOne({ username: username.toLowerCase().trim() });
    if (!user) throw unauthorized('identifiants incorrects');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw unauthorized('identifiants incorrects');
    const token = signToken({ userId: String(user._id), username: user.username });
    return {
      token,
      user: { id: String(user._id), username: user.username, displayName: user.displayName, role: user.role },
    };
  },

  /** Crée ou met à jour un compte (utilisé par le seed). */
  async upsertUser(username: string, displayName: string, password: string, role: 'admin' | 'editor' = 'editor') {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.findOneAndUpdate(
      { username: username.toLowerCase().trim() },
      { $set: { username: username.toLowerCase().trim(), displayName, passwordHash, role } },
      { upsert: true, new: true },
    );
    return user;
  },
};
