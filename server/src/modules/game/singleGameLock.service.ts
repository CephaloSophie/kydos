import { UserModel } from '../user/user.model.js';
import { conflict } from '../../core/HttpError.js';

/**
 * Verrou « une partie à la fois » (SPEC §3.8).
 * Un utilisateur ne peut pas rejoindre / créer une nouvelle session tant
 * qu'il en a une active. Le service manipule uniquement `User.activeSession`.
 *
 * Il est SÉPARÉ des services table/game pour rester atomique et testable ;
 * il est appelé depuis chaque point d'entrée qui engage un utilisateur.
 */
export class SingleGameLockService {
  /**
   * Renvoie l'id de la session active de l'utilisateur (ou `null`).
   */
  async activeSessionOf(userId: string): Promise<string | null> {
    const userDocument: any = await UserModel.findById(userId).select("activeSession").lean();
    return userDocument?.activeSession ? String(userDocument.activeSession) : null;
  }

  /**
   * Réserve la session pour l'utilisateur. Rejette avec 409 s'il en a déjà
   * une (sauf si c'est la même — opération idempotente).
   */
  async acquire(userId: string, sessionId: string): Promise<void> {
    const current = await this.activeSessionOf(userId);
    if (current && current !== sessionId) throw conflict('déjà engagé dans une partie');
    if (!current) await UserModel.findByIdAndUpdate(userId, { $set: { activeSession: sessionId } });
  }

  /** Libère la session active de l'utilisateur (fin ou annulation). */
  async release(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { $set: { activeSession: null } });
  }

  /** Libère TOUS les utilisateurs d'une session (fin de partie côté serveur). */
  async releaseAllOf(sessionId: string): Promise<void> {
    await UserModel.updateMany({ activeSession: sessionId }, { $set: { activeSession: null } });
  }
}

export const singleGameLockService = new SingleGameLockService();
