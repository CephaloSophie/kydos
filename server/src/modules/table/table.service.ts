import type { Server } from 'socket.io';
import { TableModel } from './table.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { UserModel } from '../user/user.model.js';
import { singleGameLockService } from '../game/singleGameLock.service.js';
import { eligibilityService } from './eligibility.service.js';
import { serializeTable, createEmptySeats, teamOfSeatIndex } from './table.serializer.js';
import { createLogger } from '../../core/logger.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../../core/HttpError.js';

const logger = createLogger('table');
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const START_DELAY_MS = 5000; // compte à rebours avant le départ automatique (SPEC §3.3)
const ROBOT_SEAT_TIMEOUT_MS = 10000; // libère un siège robot non complété pour ne pas bloquer la table

export interface SeatChangeOutcome {
  table: ReturnType<typeof serializeTable>;
  shouldAutoStart: boolean;
  tableId: string;
  startDelayMs: number;
}

export class TableService {
  private socketServer: Server | null = null;
  /** Timers de libération de siège robot par table (évite les blocages). */
  private robotSeatTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Règle anti-blocage (SPEC §3.3, hybride/acier uniquement) : si un joueur a
   * placé UN robot mais laisse le siège partenaire de son équipe vide plus de
   * 10 s, on libère SES robots pour que d'autres puissent prendre les 2 sièges.
   * En Carré Royal (4 humains), pas de robots — donc pas de timeout.
   */
  private scheduleRobotSeatTimeout(tableId: string, ownerId: string) {
    const key = `${tableId}:${ownerId}`;
    const existing = this.robotSeatTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      this.robotSeatTimers.delete(key);
      const table: any = await TableModel.findById(tableId);
      if (!table || table.status !== 'lobby' || table.kind === 'royal') return;
      // Les sièges détenus par ce propriétaire.
      const owned = table.seats.filter((seat: any) => seat.kind === 'robot' && String(seat.ownerId) === ownerId);
      if (!owned.length) return;
      // Combien de sièges son équipe attend-elle encore ? En hybride 1 robot
      // partenaire ; en acier 2 robots. Si l'ensemble n'est pas complet et que
      // des sièges libres subsistent, on libère.
      const stillEmpty = table.seats.some((seat: any) => seat.kind === 'empty');
      const needed = table.kind === 'acier' ? 2 : 1;
      if (owned.length < needed && stillEmpty) {
        for (const seat of owned) Object.assign(seat, { kind: 'empty', user: null, robot: null, ownerId: null, name: '' });
        await singleGameLockService.release(ownerId);
        this.markActivity(table);
        await table.save();
        logger.info('siège robot libéré (timeout anti-blocage)', { table: tableId, ownerId });
        this.broadcastTable(table);
      }
    }, ROBOT_SEAT_TIMEOUT_MS);
    timer.unref?.();
    this.robotSeatTimers.set(key, timer);
  }

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

  /**
   * Crée une table selon son TYPE (SPEC §3.3). Le créateur est toujours assis
   * au siège A (équipe A). Selon le type :
   *   • hybride — le créateur prend A ; C/D restent libres pour l'adversaire ;
   *     un robot du créateur peut être placé en B (son partenaire).
   *   • acier   — le créateur prend A et place DEUX de ses robots (ils jouent
   *     ENSEMBLE, donc côte à côte dans l'équipe A : sièges A et C).
   *   • royal   — 4 humains, le créateur en A, B/C/D libres.
   *
   * `robotIds` : robots du créateur à pré-placer (0, 1 ou 2 selon le type).
   */
  async createTable(userId: string, options: { visibility?: string; forTeam?: boolean; kind?: string; robotIds?: string[]; config?: any }) {
    const userDocument = await UserModel.findById(userId).select('username team');
    if (!userDocument) throw unauthorized();

    const kind = ['hybride', 'acier', 'royal'].includes(options.kind ?? '') ? options.kind! : 'hybride';
    const ownerType = options.forTeam && userDocument.team ? 'team' : 'user';
    const seats = createEmptySeats();
    // Le créateur : toujours siège A (équipe A).
    seats[0] = { index: 0, kind: 'human', user: userDocument._id, robot: null, ownerId: null, name: userDocument.username };

    // Résolution des robots demandés (doivent appartenir au créateur).
    const robotIds = (options.robotIds ?? []).slice(0, 2);
    const robots = robotIds.length
      ? await RobotModel.find({ _id: { $in: robotIds }, owner: userId }).lean()
      : [];
    if (robots.length !== robotIds.length) throw badRequest('robot introuvable ou non possédé');

    if (kind === 'hybride') {
      // Un robot partenaire du créateur en B (même équipe A ? non : B = équipe B).
      // Règle belote : les 2 robots d'une personne jouent ENSEMBLE. Ici le créateur
      // n'a qu'UN robot partenaire — il rejoint donc l'équipe A, siège C.
      if (robots.length >= 1) {
        const r = robots[0];
        seats[2] = { index: 2, kind: 'robot', user: null, robot: r._id, ownerId: userDocument._id, name: r.name };
      }
    } else if (kind === 'acier') {
      // DEUX robots du créateur, ENSEMBLE dans l'équipe A : sièges A(0) et C(2).
      // Le créateur ne s'assied pas : c'est une partie « robots contre robots »
      // côté joueur, il pilote son duo. On place le créateur en observateur du
      // duo — mais SPEC : « un joueur choisit deux robots ». Le créateur reste
      // propriétaire, les 2 robots occupent A et C.
      if (robots.length !== 2) throw badRequest('Duo d\'Acier : sélectionnez exactement deux robots');
      seats[0] = { index: 0, kind: 'robot', user: null, robot: robots[0]._id, ownerId: userDocument._id, name: robots[0].name };
      seats[2] = { index: 2, kind: 'robot', user: null, robot: robots[1]._id, ownerId: userDocument._id, name: robots[1].name };
    }
    // 'royal' : rien à pré-placer, les 4 sièges humains se remplissent ensuite.

    const tableDocument = await TableModel.create({
      status: 'lobby',
      kind,
      ownerType,
      owner: userDocument._id,
      team: ownerType === 'team' ? userDocument.team : null,
      visibility: options.visibility === 'public' ? 'public' : 'private',
      config: { ...(options.config ?? {}) },
      seats,
    });
    // Verrou : le créateur est engagé sur cette table dès sa création.
    await singleGameLockService.acquire(userId, String(tableDocument._id));
    logger.info('table créée', { id: String(tableDocument._id), kind, ownerType, by: userDocument.username });
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

    // Défense en profondeur : une assignation manquante ne doit pas être
    // interprétée comme un identifiant de robot (sinon message trompeur).
    if (assignment !== 'me' && !assignment) throw badRequest('assignation requise (« me » ou identifiant de robot)');

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

    // SPEC §3.8 — verrou « une seule partie à la fois » : dès qu'un
    // utilisateur pose un pion (soi ou robot) sur cette table, son
    // activeSession est réservée à cette table.
    await singleGameLockService.acquire(userId, tableId);

    this.markActivity(tableDocument);
    await tableDocument.save();
    logger.info('siège mis à jour', { table: String(tableDocument._id), seatIndex, assignment });
    const payload = this.broadcastTable(tableDocument);

    // Vérifie la règle de complétude du DUO de robots (hybride/acier) : quand
    // quelqu'un place un robot mais laisse l'autre siège de son équipe vide
    // trop longtemps, on libère son robot pour ne pas bloquer la table.
    this.scheduleRobotSeatTimeout(String(tableDocument._id), userId);

    const allSeatsFilled = tableDocument.seats.every((seat: any) => seat.kind !== 'empty');
    if (tableDocument.status === 'lobby' && allSeatsFilled) {
      tableDocument.status = 'playing';
      tableDocument.startsAt = new Date(Date.now() + START_DELAY_MS);
      await tableDocument.save();
      // Compte à rebours diffusé : tous les clients redirigent vers la table AU
      // MÊME MOMENT, sans bouton « Lancer ».
      this.socketServer?.to(`table:${tableDocument._id}`).emit('table:countdown', { tableId: String(tableDocument._id), startsInMs: START_DELAY_MS });
      logger.info('table complète -> départ auto (5s)', { table: String(tableDocument._id) });
      this.broadcastTable(tableDocument);
      return { table: payload, shouldAutoStart: true, tableId: String(tableDocument._id), startDelayMs: START_DELAY_MS };
    }
    return { table: payload, shouldAutoStart: false, tableId: String(tableDocument._id), startDelayMs: START_DELAY_MS };
  }

  /**
   * Annule une table en ATTENTE (SPEC §3.8) : autorisé au créateur tant que
   * les 4 sièges ne sont pas tous pris. Dès que la table est complète (ou en
   * jeu), l'annulation est refusée. Libère le verrou des joueurs déjà assis.
   */
  async cancelPending(tableId: string, userId: string) {
    const tableDocument = await TableModel.findById(tableId);
    if (!tableDocument) throw notFound();
    if (String(tableDocument.owner) !== userId) throw forbidden('créateur requis');
    if (tableDocument.status !== 'lobby') throw conflict('partie déjà lancée — annulation impossible');
    const allSeatsFilled = tableDocument.seats.every((seat: any) => seat.kind !== 'empty');
    if (allSeatsFilled) throw conflict('table complète — annulation impossible');

    // Libère le verrou « une partie à la fois » de tous les humains assis.
    const seatedUserIds = new Set<string>();
    for (const seat of tableDocument.seats) {
      if (seat.user) seatedUserIds.add(String(seat.user));
      if (seat.ownerId) seatedUserIds.add(String(seat.ownerId));
    }
    for (const uid of seatedUserIds) await singleGameLockService.release(uid);

    tableDocument.status = 'draft';
    tableDocument.seats = tableDocument.seats.map((seat: any) => ({ ...seat, kind: 'empty', user: null, robot: null, ownerId: null, name: '' })) as any;
    this.markActivity(tableDocument);
    await tableDocument.save();
    this.broadcastTable(tableDocument);
    logger.info('table pending annulée', { table: String(tableDocument._id), by: userId });
    return { ok: true };
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
