import type { Server } from 'socket.io';
import { liveGameService } from '../game/liveGame.service.js';
import { createLogger } from '../../core/logger.js';

const logger = createLogger('table-ws');

/** Nombre maximum de spectateurs simultanés par table (SPEC §3.7). */
export const MAX_SPECTATORS = 5;

/**
 * Compte les spectateurs (sockets connectés au canal sans être joueur assis)
 * pour une table donnée. On garde le calcul ici pour éviter un couplage
 * inutile avec liveGame.
 */
async function countSpectators(server: Server, tableId: string): Promise<number> {
  const sockets = await server.in(`table:${tableId}`).fetchSockets();
  return sockets.filter((s) => !liveGameService.hasSeat(tableId, s.data.userId)).length;
}

/** Branche les events WebSocket du domaine table/jeu sur le canal `table:{id}`. */
export function registerTableSocketHandlers(server: Server) {
  server.on('connection', (socket) => {
    socket.on('table:subscribe', async (tableId: string) => {
      if (!tableId) return;

      // Refus si l'utilisateur veut SUIVRE une partie sans y être assis et
      // que le quota de spectateurs est déjà atteint (SPEC §3.7 max 5).
      const isSeated = liveGameService.hasSeat(tableId, socket.data.userId);
      if (!isSeated) {
        const spectatorCount = await countSpectators(server, tableId);
        if (spectatorCount >= MAX_SPECTATORS) {
          socket.emit('table:spectator:full', { tableId, max: MAX_SPECTATORS });
          logger.debug('spectateurs pleins', { tableId, spectatorCount });
          return;
        }
      }
      socket.join(`table:${tableId}`);
      liveGameService.resumeSeat(server, tableId, socket.data.userId);
      liveGameService.resendState(server, tableId);
      void liveGameService.broadcastSpectatorCount(server, tableId);
      // La partie n'est plus en mémoire (terminée pendant l'absence) : on
      // informe le client pour qu'il affiche l'écran de fin au lieu d'attendre.
      if (!liveGameService.isLive(tableId)) {
        const finished = await liveGameService.finishedInfo(tableId);
        if (finished) socket.emit('table:finished', finished);
      }
      logger.debug('abonnement', { tableId, userId: socket.data.userId, isSeated });
    });

    socket.on('table:unsubscribe', (tableId: string) => {
      if (!tableId) return;
      // Si un joueur ASSIS quitte, son robot prend la main immédiatement (pas
      // d'attente de timeout) — la partie continue sans blocage.
      liveGameService.markSeatLeft(server, tableId, socket.data.userId);
      socket.leave(`table:${tableId}`);
      // Recompter les spectateurs après le départ effectif du canal.
      void liveGameService.broadcastSpectatorCount(server, tableId);
    });

    // Signaux de partie (émis par un joueur assis) — smiley, réflexion.
    socket.on('table:signal', ({ tableId, kind, data }: any) => {
      if (!tableId || !kind) return;
      if (!liveGameService.hasSeat(tableId, socket.data.userId)) return; // spectateur muet
      liveGameService.pushSignal(server, tableId, socket.data.userId, kind, data);
    });

    socket.on('disconnecting', () => {
      // À la fermeture brutale : substituer le joueur sur toutes ses tables et
      // recompter les spectateurs (en excluant ce socket qui s'en va).
      for (const room of socket.rooms) {
        if (typeof room === 'string' && room.startsWith('table:')) {
          const tableId = room.slice('table:'.length);
          liveGameService.markSeatLeft(server, tableId, socket.data.userId);
          void liveGameService.broadcastSpectatorCount(server, tableId, socket.id);
        }
      }
    });

    socket.on('table:bid', ({ tableId, bid }: any) => liveGameService.submitBid(server, socket.data.userId, tableId, bid));
    socket.on('table:play', ({ tableId, card }: any) => liveGameService.playCard(server, socket.data.userId, tableId, card));
  });
}
