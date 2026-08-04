import type { NextFunction, Request, Response } from 'express';

/** Enveloppe un handler async pour propager ses rejects vers next(). */
export const asyncHandler =
  <R extends Request = Request>(fn: (req: R, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as R, res, next)).catch(next);
  };
