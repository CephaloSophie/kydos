import type { Server } from 'socket.io';

/** Le client peut s'abonner aux changements pour rafraîchir la liste sans polling. */
export function registerCompetitionSocketHandlers(server: Server) {
  server.on('connection', (socket) => {
    socket.on('competitions:subscribe', () => socket.join('competitions'));
    socket.on('competitions:unsubscribe', () => socket.leave('competitions'));
  });
}
