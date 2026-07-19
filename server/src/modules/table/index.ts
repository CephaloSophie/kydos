import type { Server } from 'socket.io';
import type { AppModule } from '../../core/AppModule.js';
import { tableRouter } from './table.routes.js';
import { registerTableSocketHandlers } from './table.socket.js';
import { tableService } from './table.service.js';
import { attachTableControllerSocket } from './table.controller.js';

export const tableModule: AppModule = {
  name: 'table',
  basePath: '/',
  router: tableRouter,
  registerSocketHandlers: (server: Server) => {
    tableService.attachSocketServer(server);
    attachTableControllerSocket(server);
    registerTableSocketHandlers(server);
  },
  startBackgroundTasks: () => tableService.startIdleSweeper(),
};

export { TableModel } from './table.model.js';
export { tableService } from './table.service.js';
