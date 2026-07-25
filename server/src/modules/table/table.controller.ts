import type { Response } from 'express';
import type { Server } from 'socket.io';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { tableService } from './table.service.js';
import { liveGameService } from '../game/liveGame.service.js';

let socketServer: Server | null = null;
export function attachTableControllerSocket(server: Server) { socketServer = server; }

export class TableController {
  async create(request: AuthenticatedRequest, response: Response) {
    const { visibility, forTeam, config, kind, robotIds } = request.body ?? {};
    response.json({ table: await tableService.createTable(request.userId!, { visibility, forTeam: !!forTeam, config, kind, robotIds }) });
  }

  async list(request: AuthenticatedRequest, response: Response) {
    response.json({ tables: await tableService.listOpenTables(request.userId!) });
  }

  async getById(request: AuthenticatedRequest, response: Response) {
    response.json({ table: await tableService.getTableById(request.params.id, request.userId!) });
  }

  async changeSeat(request: AuthenticatedRequest, response: Response) {
    const { index, as: assignment } = request.body ?? {};
    const outcome = await tableService.changeSeat(request.params.id, request.userId!, index, assignment, request.ip);
    if (outcome.shouldAutoStart && socketServer) {
      setTimeout(() => liveGameService.launch(socketServer!, outcome.tableId), outcome.startDelayMs);
    }
    response.json({ table: outcome.table });
  }

  async cancel(request: AuthenticatedRequest, response: Response) {
    response.json(await tableService.cancelPending(request.params.id, request.userId!));
  }
  async leave(request: AuthenticatedRequest, response: Response) {
    response.json({ ok: true, status: await tableService.leaveTable(request.params.id, request.userId!) });
  }

  async start(request: AuthenticatedRequest, response: Response) {
    const outcome = await tableService.startTable(request.params.id, request.userId!);
    if (socketServer) setTimeout(() => liveGameService.launch(socketServer!, outcome.tableId), outcome.startDelayMs);
    response.json({ table: outcome.table });
  }
}

export const tableController = new TableController();
