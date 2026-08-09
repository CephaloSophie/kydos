import type { AppModule } from '../../core/AppModule.js';
import { matchmakingRouter } from './matchmaking.routes.js';
import { matchSocket } from '../matches/match.socket.js';

export const matchmakingModule: AppModule = {
  name: 'matchmaking',
  router: matchmakingRouter,
  registerSocketHandlers: (server) => matchSocket.attachTo(server),
};
