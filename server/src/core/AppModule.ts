import type { Router } from 'express';
import type { Server } from 'socket.io';

/**
 * Contrat d'un module applicatif autonome.
 * Un module = un domaine complet (model + service + controller + routes + sockets).
 * On peut l'ajouter ou le retirer en une ligne dans le registre de modules.
 */
export interface AppModule {
  /** Nom du domaine (ex. "table", "game"). */
  name: string;
  /** Préfixe REST monté sous /api (ex. "/rooms"). Optionnel. */
  basePath?: string;
  /** Router REST du module. Optionnel (un module peut n'avoir que des sockets). */
  router?: Router;
  /** Branche les handlers WebSocket du module. Optionnel. */
  registerSocketHandlers?: (server: Server) => void;
  /** Tâches de fond du module (sweepers, crons). Optionnel. */
  startBackgroundTasks?: () => void;
}
