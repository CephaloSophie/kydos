import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-change-me';
const JWT_EXPIRY = '4h';

export interface AdminRequest extends Request {
  adminId?: string;
}

export function signAdminToken(userId: string): string {
  return jwt.sign({ sub: userId, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyAdminToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

export const requireAdmin: RequestHandler = async (req: AdminRequest, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requis' });
    return;
  }
  const userId = verifyAdminToken(header.slice(7));
  if (!userId) {
    res.status(401).json({ error: 'Token invalide ou expiré' });
    return;
  }
  const UserModel = mongoose.model('User');
  const user = await UserModel.findById(userId).select('role username').lean() as any;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Accès admin requis' });
    return;
  }
  req.adminId = userId;
  next();
};
