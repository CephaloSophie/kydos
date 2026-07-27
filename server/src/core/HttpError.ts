/** Erreur HTTP transportant un code de statut, levée par les services. */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = 'authentification requise') => new HttpError(401, message);
export const forbidden = (message: string) => new HttpError(403, message);
export const notFound = (message = 'introuvable') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
