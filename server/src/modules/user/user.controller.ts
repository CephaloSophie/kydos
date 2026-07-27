import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { userService } from './user.service.js';

export class UserController {
  async getProfile(request: AuthenticatedRequest, response: Response) {
    response.json({ profile: await userService.getPublicProfile(request.params.id) });
  }

  async search(request: AuthenticatedRequest, response: Response) {
    response.json({ users: await userService.search(String(request.query.q ?? ''), request.userId!) });
  }
}

export const userController = new UserController();
