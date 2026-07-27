import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { authService } from './auth.service.js';

export class AuthController {
  async register(request: AuthenticatedRequest, response: Response) {
    const { username, password, email } = request.body ?? {};
    response.json(await authService.register(username, password, email));
  }

  async login(request: AuthenticatedRequest, response: Response) {
    const { username, password } = request.body ?? {};
    response.json(await authService.login(username, password));
  }

  async getCurrentUser(request: AuthenticatedRequest, response: Response) {
    response.json({ user: await authService.getCurrentUser(request.userId!) });
  }

  async updateSettings(request: AuthenticatedRequest, response: Response) {
    const { responseTimeMs, maxPlayTimeMs, defaultManches } = request.body ?? {};
    response.json({ settings: await authService.updateSettings(request.userId!, responseTimeMs, maxPlayTimeMs, defaultManches) });
  }
}

export const authController = new AuthController();
