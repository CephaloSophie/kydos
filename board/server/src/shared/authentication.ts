/* =============================================================================
 * SHARED · authentication.ts — JWT (signature/vérification) + middleware Express.
 * -----------------------------------------------------------------------------
 * Deux comptes seed (ameur, hamido) sont créés par le seed. Chaque token porte
 * l'`id` et le `username` de l'utilisateur ; l'expiration est de 12 h.
 * ========================================================================== */
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { environment } from '../core/environment.js';
import { unauthorized } from '../core/HttpError.js';

export interface AuthPayload { userId: string; username: string }

export interface AuthenticatedRequest extends Request { userId?: string; username?: string }

/** Signe un token avec 12 h de validité. */
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, environment.jwtSecret, { expiresIn: '12h' });
}

/** Vérifie un token ; renvoie le payload ou lève 401. */
export function verifyToken(token: string): AuthPayload {
  try {
    const decoded = jwt.verify(token, environment.jwtSecret) as AuthPayload;
    if (!decoded.userId || !decoded.username) throw unauthorized('token invalide');
    return decoded;
  } catch { throw unauthorized('token invalide ou expiré'); }
}

/** Middleware : impose un token Bearer valide et renseigne `req.userId` / `req.username`. */
export function requireAuthentication(request: AuthenticatedRequest, _response: Response, next: NextFunction): void {
  const header = request.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) { next(unauthorized('en-tête Authorization manquant')); return; }
  try {
    const payload = verifyToken(match[1]);
    request.userId = payload.userId;
    request.username = payload.username;
    next();
  } catch (error) { next(error); }
}
