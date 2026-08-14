/* =============================================================================
 * MATCHES · match.socket.ts — Broadcast des événements de match.
 * -----------------------------------------------------------------------------
 * Handler WebSocket pour les matchs (hors DUO_STEEL) :
 *   • `match:spectate`  — un client rejoint la room `match:<id>` (max 10,
 *                          DUO_STEEL refusé).
 *   • `match:leave-spectate` — quitte la room.
 *
 * Le serveur écoute aussi ses propres émissions internes pour SETTLER les
 * matchs temps-réel : dès qu'une Table éphémère finit, on cherche le Match
 * lié via `liveTableId` et on lance `matchLiveService.settle` qui copie le
 * résultat, crédite les gagnants et enregistre le rake.
 *
 * Le résultat est ainsi consistant qu'on ait joué en headless (DUO_STEEL)
 * ou en temps-réel (HYBRID / ROYAL) : le Match a toujours `winnerTeam`,
 * `scoreTeamA/B`, `gameId`, `status: finished` en fin de partie.
 * ========================================================================== */
import type { Server, Socket } from 'socket.io';
import { MatchModel } from './match.model.js';
import { MatchFormat } from './matchFormat.js';
import { createLogger } from '../../core/logger.js';

const log = createLogger('match-socket');
export const MAX_SPECTATORS_PER_MATCH = 10;
const MATCH_ROOM_PREFIX = 'match:';

interface SpectatorRegistry { count: number }
const spectatorCounts = new Map<string, SpectatorRegistry>();

function roomFor(matchId: string): string { return `${MATCH_ROOM_PREFIX}${matchId}`; }

export class MatchSocket {
  attachTo(server: Server): void {
    // Sweep périodique : détecte les tables liées à un Match qui sont
    // terminées (via liveGameService.finishedInfo) et fait le settle. Un
    // simple setInterval évite d'introduire un couplage direct avec
    // liveGameService.
    const SWEEP_INTERVAL_MS = 3000;
    const sweepHandle = setInterval(async () => {
      try {
        const { matchLiveService } = await import('./match.liveRunner.js');
        // 1) Démarre les Tables éphémères issues d'un Match (liveGameService.launch).
        await matchLiveService.launchPendingMatchTables(server);
        // 2) Configure les remplaçants pour les tables live qui viennent d'un
        //    Match (une seule fois par table dès qu'elle est live).
        await matchLiveService.attachPendingSubstitutes();
        // 3) Détecte les matchs terminés et fait le settle (score, gains, rake).
        await matchLiveService.sweepFinishedMatches(server);
      } catch { /* résilience */ }
    }, SWEEP_INTERVAL_MS);
    // Le handle est référencé pour cleanup éventuel (server.on('close')).
    (server as any).__matchSocketSweep = sweepHandle;

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

    log.info('match socket handler attaché', { sweepMs: SWEEP_INTERVAL_MS });
  }

  /** Broadcast interne (appelé par le runner à chaque événement moteur). */
  broadcast(server: Server, matchId: string, event: string, data: unknown): void {
    server.to(roomFor(matchId)).emit(event, data);
  }
}

export const matchSocket = new MatchSocket();
