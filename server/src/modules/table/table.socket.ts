import type { Server } from 'socket.io';
import { liveGameService } from '../game/liveGame.service.js';
import { createLogger } from '../../core/logger.js';

const logger = createLogger('table-ws');

/** Branche les events WebSocket du domaine table/jeu sur le canal `table:{id}`. */
export function registerTableSocketHandlers(server: Server) {
  server.on('connection', (socket) => {
    socket.on('table:subscribe', (tableId: string) => {
      if (!tableId) return;
      socket.join(`table:${tableId}`);
      liveGameService.resendState(server, tableId);
      logger.debug('abonnement', { tableId, userId: socket.data.userId });
    });
    socket.on('table:unsubscribe', (tableId: string) => { if (tableId) socket.leave(`table:${tableId}`); });
    socket.on('table:bid', ({ tableId, bid }: any) => liveGameService.submitBid(server, socket.data.userId, tableId, bid));
    socket.on('table:play', ({ tableId, card }: any) => liveGameService.playCard(server, socket.data.userId, tableId, card));
  });
}
