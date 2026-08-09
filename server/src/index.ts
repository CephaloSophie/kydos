import http from 'node:http';
import { Server } from 'socket.io';
import { environment } from './core/environment.js';
import { connectDatabase, disconnectDatabase } from './core/database.js';
import { createLogger } from './core/logger.js';
import { createExpressApplication, registerModuleSockets } from './app.js';
import { attachSocketAuthentication } from './shared/socketAuthentication.js';
import { registerMonitorSocket } from './modules/monitor/monitor.module.js';

const logger = createLogger('server');

const application = createExpressApplication();
const httpServer = http.createServer(application);
const socketServer = new Server(httpServer, { cors: { origin: environment.corsOrigins.includes('*') ? '*' : environment.corsOrigins } });

attachSocketAuthentication(socketServer);

// La base est connectée AVANT les tâches de fond des modules (ex. reprise des matches
// de compétition qui interroge la base au démarrage).
async function bootstrap() {
  await connectDatabase();
  registerModuleSockets(socketServer);
  registerMonitorSocket(socketServer);
  httpServer.listen(environment.port, '0.0.0.0', () => logger.info(`API + WebSocket sur 0.0.0.0:${environment.port}`, { cors: environment.corsOrigins }));
}
void bootstrap();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    logger.info(`arrêt (${signal})`);
    await disconnectDatabase();
    process.exit(0);
  });
}
