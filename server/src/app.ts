import express, { type Express } from 'express';
import cors from 'cors';
import type { Server } from 'socket.io';
import { environment } from './core/environment.js';
import { createLogger } from './core/logger.js';
import { applicationModules } from './modules/index.js';
import { HttpError } from './core/HttpError.js';
import { registerMonitorRoutes } from './modules/monitor/monitor.module.js';

const logger = createLogger('app');

/** Construit l'application Express en montant chaque module sous /api. */
export function createExpressApplication(): Express {
  const application = express();
  // CORS multi-domaines : autorise chaque origine listée (ou toutes si '*').
  const allowedOrigins = environment.corsOrigins;
  application.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`origine non autorisée : ${origin}`));
    },
    credentials: true,
  }));
  application.use(express.json({ limit: '5mb' }));

  application.use((request, response, next) => {
    const startTime = Date.now();
    response.on('finish', () => logger.debug(`${request.method} ${request.path}`, { status: response.statusCode, durationMs: Date.now() - startTime }));
    next();
  });

  application.get('/health', (_request, response) => response.json({ ok: true }));

  for (const appModule of applicationModules) {
    if (appModule.router) {
      application.use('/api' + (appModule.basePath ?? '/'), appModule.router);
      logger.info('module REST monté', { module: appModule.name, basePath: '/api' + (appModule.basePath ?? '/') });
    }
  }

  // Moniteur temps réel (dev) : sessions + logs.
  registerMonitorRoutes(application);

  // 404 explicite pour toute route /api inconnue (sinon Express renvoie du HTML).
  application.use('/api', (_request, response) => response.status(404).json({ error: 'route inconnue' }));

  /**
   * Gestionnaire d'erreurs CENTRAL (il manquait : les HttpError levées par les
   * services remontaient au handler par défaut d'Express, qui répondait du HTML
   * avec le statut brut — d'où des 404 opaques côté client).
   */
  application.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'erreur interne';
    if (status >= 500) logger.error('erreur non gérée', { message });
    response.status(status).json({ error: message });
  });

  return application;
}

/** Branche les handlers WebSocket et tâches de fond de chaque module. */
export function registerModuleSockets(server: Server): void {
  for (const appModule of applicationModules) {
    appModule.registerSocketHandlers?.(server);
    appModule.startBackgroundTasks?.();
    if (appModule.registerSocketHandlers) logger.info('module WS branché', { module: appModule.name });
  }
}
