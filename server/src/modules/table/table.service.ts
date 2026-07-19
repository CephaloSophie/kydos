import type { Server } from 'socket.io';
import { TableModel } from './table.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { UserModel } from '../user/user.model.js';
import { eligibilityService } from './eligibility.service.js';
import { serializeTable, createEmptySeats, teamOfSeatIndex } from './table.serializer.js';
import { createLogger } from '../../core/logger.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../../core/HttpError.js';

const logger = createLogger('table');
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const START_DELAY_MS = 3000;

export interface SeatChangeOutcome {
  table: ReturnType<typeof serializeTable>;
  shouldAutoStart: boolean;
  tableId: string;
  startDelayMs: number;
}

export class TableService {
  private socketServer: Server | null = null;

  attachSocketServer(server: Server) {
    this.socketServer = server;
  }

  private broadcastTable(tableDocument: any) {
    const payload = serializeTable(tableDocument);
    this.socketServer?.to(`table:${payload.id}`).emit('table:update', payload);
    this.socketServer?.emit('tables:changed');
    return payload;
  }

  private markActivity(tableDocument: any) {
    tableDocument.lastActivityAt = new Date();
  }

  async canAccessTable(tableDocument: any, userId: string): Promise<boolean> {
    if (String(tableDocument.owner) === userId) return true;
    if (tableDocument.ownerType === 'team') {
      const userDocument = await UserModel.findById(userId).select('team');
      return !!userDocument?.team && String(userDocument.team) === String(tableDocument.team);
    }
    return tableDocument.visibility === 'public';
  }

  async createTable(userId: string, visibility: string, forTeam: boolean, config: any) {
    const userDocument = await UserModel.findById(userId).select('username team');
    if (!userDocument) throw unauthorized();
    const ownerType = forTeam && userDocument.team ? 'team' : 'user';
    const seats = createEmptySeats();
    seats[0] = { index: 0, kind: 'human', user: userDocument._id, robot: null, ownerId: null, name: userDocument.username };
    const tableDocument = await TableModel.create({
      status: 'lobby',
      ownerType,
      owner: userDocument._id,
      team: ownerType === 'team' ? userDocument.team : null,
      visibility: visibility === 'public' ? 'public' : 'private',
      config: { ...(config ?? {}) },
      seats,
    });
    logger.info('table créée', { id: String(tableDocument._id), ownerType, by: userDocument.username });
    return this.broadcastTable(tableDocument);
  }

  async listOpenTables(userId: string) {
    const userDocument = await UserModel.findById(userId).select('team');
    const orConditions: any[] = [{ visibility: 'public' }, { owner: userId }];
    if (userDocument?.team) orConditions.push({ ownerType: 'team', team: userDocument.team });
    const tableDocuments = await TableModel.find({ status: 'lobby', $or: orConditions }).sort('-lastActivityAt').limit(40).lean();
    return tableDocuments.map(serializeTable);
  }

  async getTableById(tableId: string, userId: string) {
    const tableDocument = await TableModel.findById(tableId);
    if (!tableDocument || tableDocument.status === 'draft') throw notFound();
    if (!(await this.canAccessTable(tableDocument, userId))) throw forbidden('accès refusé');
    return serializeTable(tableDocument);
  }

  async changeSeat(tableId: string, userId: string, seatIndex: number, assignment: string, requestIp?: string): Promise<SeatChangeOutcome> {
    const tableDocument = await TableModel.findById(tableId);
    if (!tableDocument) throw notFound();
    if (tableDocument.status !== 'lobby') throw conflict('partie déjà lancée');
    if (!(await this.canAccessTable(tableDocument, userId))) throw forbidden('accès refusé');

    const targetSeat = tableDocument.seats.find((seat: any) => seat.index === seatIndex);
    if (!targetSeat) throw badRequest('siège invalide');
    if (targetSeat.kind !== 'empty' && String(targetSeat.user ?? '') !== userId && String(targetSeat.ownerId ?? '') !== userId) {
      throw conflict('siège occupé');
    }

    if (assignment === 'me') {
      const otherHumans = tableDocument.seats
        .filter((seat: any) => seat.kind === 'human' && String(seat.user) !== userId)
        .map((seat: any) => ({ userId: String(seat.user), ip: requestIp }));
      if (!eligibilityService.canPlayTogether({ tableType: 'friendly', players: [{ userId, ip: requestIp }, ...otherHumans] })) {
        throw forbidden('jeu non autorisé entre ces joueurs');
      }
      for (const seat of tableDocument.seats) {
        if (seat.kind === 'human' && String(seat.user) === userId) Object.assign(seat, { kind: 'empty', user: null, name: '' });
      }
      const userDocument = await UserModel.findById(userId).select('username');
      Object.assign(targetSeat, { kind: 'human', user: userDocument!._id, robot: null, ownerId: null, name: userDocument!.username });
    } else {
      const robotDocument = await RobotModel.findById(assignment);
      if (!robotDocument || String(robotDocument.owner) !== userId) throw forbidden('robot inconnu');
      if (tableDocument.seats.some((seat: any) => seat.index !== seatIndex && String(seat.robot ?? '') === String(robotDocument._id))) {
        throw conflict('robot déjà à cette table');
      }
      const targetTeam = teamOfSeatIndex(seatIndex);
      if (tableDocument.seats.some((seat: any) => seat.kind === 'robot' && String(seat.ownerId) === userId && teamOfSeatIndex(seat.index) !== targetTeam)) {
        throw conflict('vos robots ne peuvent jouer que dans la même équipe');
      }
      Object.assign(targetSeat, { kind: 'robot', robot: robotDocument._id, user: null, ownerId: userId, name: robotDocument.name });
    }

    this.markActivity(tableDocument);
    await tableDocument.save();
    logger.info('siège mis à jour', { table: String(tableDocument._id), seatIndex, assignment });
    const payload = this.broadcastTable(tableDocument);

    const allSeatsFilled = tableDocument.seats.every((seat: any) => seat.kind !== 'empty');
    if (tableDocument.status === 'lobby' && allSeatsFilled) {
      tableDocument.status = 'playing';
      tableDocument.startsAt = new Date(Date.now() + START_DELAY_MS);
      await tableDocument.save();
      logger.info('table complète -> départ auto', { table: String(tableDocument._id) });
      this.broadcastTable(tableDocument);
      return { table: payload, shouldAutoStart: true, tableId: String(tableDocument._id), startDelayMs: START_DELAY_MS };
    }
    return { table: payload, shouldAutoStart: false, tableId: String(tableDocument._id), startDelayMs: START_DELAY_MS };
  }

  async leaveTable(tableId: string, userId: string) {
    const tableDocument = await TableModel.findById(tableId);
    if (!tableDocument) throw notFound();
    for (const seat of tableDocument.seats) {
      if (String(seat.user ?? '') === userId || String(seat.ownerId ?? '') === userId) {
        Object.assign(seat, { kind: 'empty', user: null, robot: null, ownerId: null, name: '' });
      }
    }
    const humanCount = tableDocument.seats.filter((seat: any) => seat.kind === 'human').length;
    if (humanCount === 0 && tableDocument.status === 'lobby') {
      tableDocument.status = 'draft';
      logger.info('table vidée -> draft', { table: String(tableDocument._id) });
    }
    this.markActivity(tableDocument);
    await tableDocument.save();
    this.broadcastTable(tableDocument);
    return tableDocument.status;
  }

  async startTable(tableId: string, userId: string) {
    const tableDocument = await TableModel.findById(tableId);
    if (!tableDocument) throw notFound();
    if (String(tableDocument.owner) !== userId) throw forbidden('seul le créateur démarre');
    if (tableDocument.seats.some((seat: any) => seat.kind === 'empty')) throw badRequest('4 places requises');
    tableDocument.status = 'playing';
    tableDocument.startsAt = new Date(Date.now() + START_DELAY_MS);
    this.markActivity(tableDocument);
    await tableDocument.save();
    logger.info('départ programmé', { table: String(tableDocument._id) });
    this.broadcastTable(tableDocument);
    return { tableId: String(tableDocument._id), startDelayMs: START_DELAY_MS, table: serializeTable(tableDocument) };
  }

  startIdleSweeper() {
    setInterval(async () => {
      const cutoff = new Date(Date.now() - IDLE_TIMEOUT_MS);
      const result = await TableModel.updateMany({ status: 'lobby', lastActivityAt: { $lt: cutoff } }, { $set: { status: 'draft' } });
      const modifiedCount = (result as any).modifiedCount ?? 0;
      if (modifiedCount > 0) {
        logger.info('tables inactives -> draft', { count: modifiedCount });
        this.socketServer?.emit('tables:changed');
      }
    }, 60_000).unref?.();
  }
}

export const tableService = new TableService();
