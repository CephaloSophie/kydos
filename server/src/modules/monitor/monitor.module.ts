/* =============================================================================
 * MODULE · monitor — Observabilité temps réel (mode DÉVELOPPEMENT).
 * -----------------------------------------------------------------------------
 * Alimente le tableau `wslogs/` : sessions de jeu actives, joueurs connectés,
 * et flux de logs (info / warn / error) du serveur. Deux canaux :
 *   • REST  : GET /api/monitor/snapshot — état instantané (sessions + logs).
 *   • Socket: namespace `/monitor` — pousse chaque nouveau log et un
 *             rafraîchissement périodique des sessions.
 *
 * Réservé au développement : désactivé si MONITOR_ENABLED=false. Aucune donnée
 * de main de joueur n'est exposée (seulement des métadonnées).
 * ========================================================================== */
import type { Express, Request, Response } from 'express';
import type { Server } from 'socket.io';
import { recentLogs, subscribeLogs, createLogger } from '../../core/logger.js';
import { liveGameService } from '../game/liveGame.service.js';

const logger = createLogger('monitor');
const ENABLED = process.env.MONITOR_ENABLED !== 'false';

/** Instantané complet consommé par le tableau wslogs. */
function snapshot() {
  return {
    at: new Date().toISOString(),
    sessions: liveGameService.snapshotSessions(),
    logs: recentLogs(200),
  };
}

/** Monte la route REST du moniteur sur l'application Express. */
export function registerMonitorRoutes(application: Express) {
  if (!ENABLED) return;
  application.get('/api/monitor/snapshot', (_request: Request, response: Response) => {
    response.json(snapshot());
  });
}

/**
 * Ouvre le namespace socket `/monitor` : à la connexion, envoie l'instantané,
 * puis pousse chaque nouveau log et rafraîchit les sessions toutes les 2 s.
 */
export function registerMonitorSocket(server: Server) {
  if (!ENABLED) return;
  const namespace = server.of('/monitor');
  namespace.on('connection', (socket) => {
    socket.emit('monitor:snapshot', snapshot());
    const unsubscribe = subscribeLogs((record) => socket.emit('monitor:log', record));
    const timer = setInterval(() => socket.emit('monitor:sessions', { at: new Date().toISOString(), sessions: liveGameService.snapshotSessions() }), 2000);
    socket.on('disconnect', () => { unsubscribe(); clearInterval(timer); });
  });
  logger.info('moniteur wslogs actif', { namespace: '/monitor' });
}
