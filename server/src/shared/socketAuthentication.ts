import type { Server } from 'socket.io';
import { verifyAuthToken } from './authentication.js';
import { UserModel } from '../modules/user/user.model.js';
import { createLogger } from '../core/logger.js';

const logger = createLogger('socket-auth');

export function attachSocketAuthentication(server: Server) {
  server.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const userId = token ? verifyAuthToken(token) : null;
    if (!userId) return next(new Error('unauthorized'));
    const userDocument = await UserModel.findById(userId).select('username');
    socket.data.userId = userId;
    socket.data.username = userDocument?.username ?? 'joueur';
    next();
  });
  server.on('connection', (socket) => logger.debug('connexion', { userId: socket.data.userId }));
}
