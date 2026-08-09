/* =============================================================================
 * MATCHES · match.socket.ts — Broadcast des événements de match.
 * -----------------------------------------------------------------------------
 * Handler WebSocket minimal pour les matchs (hors DUO_STEEL) : les clients
 * s'abonnent à une room `match:<id>` pour recevoir les updates de score, les
 * annonces de fin, et pour se manifester comme spectateur (max 10 sauf pour
 * DUO_STEEL qui est purement backend).
 *
 * Version v14.1 : structure prête, pas encore de joueur temps-réel branché
 * sur le moteur belote — la table full temps-réel arrive en v14.2. Cet
 * ancêtre expose déjà l'API socket que le mobile appellera.
 * ========================================================================== */
import type { Server, Socket } from 'socket.io';
import { MatchModel } from './match.model.js';
import { MatchFormat } from './matchFormat.js';

export const MAX_SPECTATORS_PER_MATCH = 10;
const MATCH_ROOM_PREFIX = 'match:';

interface SpectatorRegistry { count: number }
const spectatorCounts = new Map<string, SpectatorRegistry>();

function roomFor(matchId: string): string { return `${MATCH_ROOM_PREFIX}${matchId}`; }

export class MatchSocket {
  attachTo(server: Server): void {
    server.on('connection', (socket: Socket) => {
      socket.on('match:spectate', async (payload: { matchId: string }, ack?: (r: { ok: boolean; error?: string }) => void) => {
        try {
          const { matchId } = payload || {};
          if (!matchId) throw new Error('matchId requis');
          const match = await MatchModel.findById(matchId).lean();
          if (!match) throw new Error('Match introuvable');

          // DUO_STEEL : pas de visuel, pas de spectateurs (spec Ameur).
          if ((match as any).format === MatchFormat.DUO_STEEL) {
            throw new Error('Ce format est purement en coulisses.');
          }
          const registry = spectatorCounts.get(matchId) || { count: 0 };
          if (registry.count >= MAX_SPECTATORS_PER_MATCH) {
            throw new Error('Table pleine (10 spectateurs max).');
          }
          registry.count++;
          spectatorCounts.set(matchId, registry);

          socket.join(roomFor(matchId));
          socket.emit('match:spectator-count', { matchId, count: registry.count });
          server.to(roomFor(matchId)).emit('match:spectator-count', { matchId, count: registry.count });

          socket.on('disconnect', () => {
            const reg = spectatorCounts.get(matchId);
            if (reg) {
              reg.count = Math.max(0, reg.count - 1);
              if (reg.count === 0) spectatorCounts.delete(matchId);
              server.to(roomFor(matchId)).emit('match:spectator-count', { matchId, count: reg.count });
            }
          });

          ack?.({ ok: true });
        } catch (e) {
          ack?.({ ok: false, error: (e as Error).message });
        }
      });

      socket.on('match:leave-spectate', (payload: { matchId: string }) => {
        const { matchId } = payload || {};
        if (matchId) socket.leave(roomFor(matchId));
      });
    });
  }

  /** Broadcast interne (appelé par le runner à chaque événement moteur). */
  broadcast(server: Server, matchId: string, event: string, data: unknown): void {
    server.to(roomFor(matchId)).emit(event, data);
  }
}

export const matchSocket = new MatchSocket();
