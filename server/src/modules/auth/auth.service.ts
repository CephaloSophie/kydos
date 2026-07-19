import bcrypt from 'bcryptjs';
import { UserModel } from '../user/user.model.js';
import { serializePublicUser } from '../user/user.serializer.js';
import { signAuthToken } from '../../shared/authentication.js';
import { badRequest, conflict, notFound, unauthorized } from '../../core/HttpError.js';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 4;

export class AuthService {
  async register(username: string, password: string, email?: string) {
    if (!username || !password || password.length < MIN_PASSWORD_LENGTH) {
      throw badRequest('username + mot de passe (>=4) requis');
    }
    if (await UserModel.findOne({ username })) throw conflict('nom déjà pris');
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userDocument = await UserModel.create({ username, email: email ?? null, passwordHash });
    return { token: signAuthToken(String(userDocument._id)), user: serializePublicUser(userDocument) };
  }

  async login(username: string, password: string) {
    const userDocument = await UserModel.findOne({ username });
    if (!userDocument || !(await bcrypt.compare(password ?? '', userDocument.passwordHash))) {
      throw unauthorized('identifiants invalides');
    }
    return { token: signAuthToken(String(userDocument._id)), user: serializePublicUser(userDocument) };
  }

  async getCurrentUser(userId: string) {
    const userDocument = await UserModel.findById(userId);
    if (!userDocument) throw notFound();
    return serializePublicUser(userDocument);
  }

  async updateSettings(userId: string, responseTimeMs: number, maxPlayTimeMs: number, defaultManches: number) {
    const userDocument = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { 'settings.responseTimeMs': responseTimeMs, 'settings.maxPlayTimeMs': maxPlayTimeMs, 'settings.defaultManches': defaultManches } },
      { new: true },
    );
    return userDocument?.settings;
  }
}

export const authService = new AuthService();
