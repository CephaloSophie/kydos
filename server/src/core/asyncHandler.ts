import type { Request, Response, NextFunction } from 'express';
import { HttpError } from './HttpError.js';

type AsyncRouteHandler = (request: any, response: Response, next: NextFunction) => Promise<unknown>;

/** Enrobe un handler async : convertit les HttpError (et autres) en réponse JSON propre. */
export function asyncHandler(handler: AsyncRouteHandler) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      if (error instanceof HttpError) {
        response.status(error.status).json({ error: error.message });
      } else {
        response.status(500).json({ error: (error as Error).message ?? 'erreur serveur' });
      }
    }
  };
}
