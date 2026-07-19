import express, { type Express } from 'express';
import cors from 'cors';
import type { Server } from 'socket.io';
import { environment } from './core/environment.js';
import { createLogger } from './core/logger.js';
import { applicationModules } from './modules/index.js';

const logger = createLogger('app');

/** Construit l'application Express en montant chaque module sous /api. */
export function createExpressApplication(): Express {
  const application = express();
  application.use(cors({ origin: environment.corsOrigin, credentials: true }));
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
