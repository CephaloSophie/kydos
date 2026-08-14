/**
 * Singleton d'accès au serveur Socket.IO. Renseigné une fois au bootstrap,
 * lu ensuite depuis les services qui n'ont pas de handle direct (ex.
 * matchLiveService qui doit déclencher `liveGameService.launch(server, id)`
 * depuis un endpoint HTTP).
 *
 * Ce raccourci évite de propager `server` en paramètre partout. Reste
 * facultatif : le sweep périodique du module socket continue de servir de
 * fallback si le socket n'est pas encore attaché.
 */
import type { Server as SocketServer } from 'socket.io';

let cached: SocketServer | null = null;

export function setSocketServer(server: SocketServer): void { cached = server; }
export function getSocketServer(): SocketServer | null { return cached; }
