/* Erreurs HTTP avec status + message. */
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'HttpError'; }
}
export const badRequest = (m: string) => new HttpError(400, m);
export const unauthorized = (m = 'authentification requise') => new HttpError(401, m);
export const forbidden = (m = 'action interdite') => new HttpError(403, m);
export const notFound = (m = 'ressource introuvable') => new HttpError(404, m);
export const conflict = (m: string) => new HttpError(409, m);
