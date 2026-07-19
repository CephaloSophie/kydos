import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { environment } from '../core/environment.js';
import { unauthorized } from '../core/HttpError.js';

const TOKEN_EXPIRATION = '7d';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ userId }, environment.jwtSecret, { expiresIn: TOKEN_EXPIRATION });
}

export function verifyAuthToken(token: string): string | null {
  try {
    return (jwt.verify(token, environment.jwtSecret) as { userId: string }).userId;
  } catch {
    return null;
  }
}

export function requireAuthentication(request: Request, _response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = token ? verifyAuthToken(token) : null;
  if (!userId) return next(unauthorized());
  (request as AuthenticatedRequest).userId = userId;
  next();
}
