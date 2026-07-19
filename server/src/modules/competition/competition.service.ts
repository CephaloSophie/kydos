import type { Server } from 'socket.io';
import { CompetitionTableModel } from './competition.model.js';
import { RobotModel } from '../robot/robot.model.js';
import { UserModel } from '../user/user.model.js';
import { competitionRunner } from './competition.runner.js';
import { InMemoryJobQueue } from '../../core/jobQueue.js';
import { createLogger } from '../../core/logger.js';
import { badRequest, conflict, forbidden, notFound } from '../../core/HttpError.js';

const logger = createLogger('competition');
const MAX_ACTIVE_TABLES_PER_USER = 2;

interface MatchJob {
  competitionId: string;
}

export class CompetitionService {
  private socketServer: Server | null = null;
  private readonly queue = new InMemoryJobQueue<MatchJob>('competition-matches', (job) => this.processMatch(job), 1);

  attachSocketServer(server: Server) {
    this.socketServer = server;
  }

  private broadcastChange() {
    this.socketServer?.emit('competitions:changed');
  }

  private async assertOwnedDistinctRobots(userId: string, robotIds: string[]) {
    if (robotIds.length !== 2) throw badRequest('exactement 2 robots requis');
    if (robotIds[0] === robotIds[1]) throw badRequest('deux robots distincts requis');
    const count = await RobotModel.countDocuments({ _id: { $in: robotIds }, owner: userId });
    if (count !== 2) throw forbidden('ces robots ne vous appartiennent pas');
  }

  private serialize(table: any, robotsById?: Map<string, any>) {
    const robotName = (id: any) => (id ? robotsById?.get(String(id))?.name ?? null : null);
    return {
      id: String(table._id),
      owner: String(table.owner),
      ownerRobots: (table.ownerRobots ?? []).map((id: any) => ({ id: String(id), name: robotName(id) })),
      challenger: table.challenger ? String(table.challenger) : null,
      challengerRobots: (table.challengerRobots ?? []).map((id: any) => ({ id: String(id), name: robotName(id) })),
      visibility: table.visibility,
      status: table.status,
      config: table.config,
      winner: table.winner,
      scoreTeamA: table.scoreTeamA,
      scoreTeamB: table.scoreTeamB,
      game: table.game ? String(table.game) : null,
      createdAt: table.createdAt,
      finishedAt: table.finishedAt,
    };
  }

  async create(userId: string, robotIds: string[], manches: number) {
    await this.assertOwnedDistinctRobots(userId, robotIds);
    const activeCount = await CompetitionTableModel.countDocuments({ owner: userId, status: { $in: ['open', 'running'] } });
    if (activeCount >= MAX_ACTIVE_TABLES_PER_USER) throw conflict(`maximum ${MAX_ACTIVE_TABLES_PER_USER} tables actives`);

    const table = await CompetitionTableModel.create({
      owner: userId,
      ownerRobots: robotIds,
      visibility: 'public',
      status: 'open',
      config: { manches: [1, 2, 4].includes(manches) ? manches : 2 },
    });
    logger.info('table de compétition créée', { id: String(table._id), owner: userId });
    this.broadcastChange();
    return this.serialize(table);
  }

  async listOpen(userId: string) {
    const tables = await CompetitionTableModel.find({ status: 'open', visibility: 'public', owner: { $ne: userId } })
      .sort('-createdAt').limit(50).lean();
    const robotIds = tables.flatMap((t: any) => t.ownerRobots ?? []);
    const robots = await RobotModel.find({ _id: { $in: robotIds } }).select('name').lean();
    const robotsById = new Map(robots.map((r: any) => [String(r._id), r]));
    return tables.map((t) => this.serialize(t, robotsById));
  }

  async listMine(userId: string) {
    const tables = await CompetitionTableModel.find({ $or: [{ owner: userId }, { challenger: userId }] })
      .sort('-createdAt').limit(100).lean();
    const robotIds = tables.flatMap((t: any) => [...(t.ownerRobots ?? []), ...(t.challengerRobots ?? [])]);
    const robots = await RobotModel.find({ _id: { $in: robotIds } }).select('name').lean();
    const robotsById = new Map(robots.map((r: any) => [String(r._id), r]));
    return tables.map((t) => this.serialize(t, robotsById));
  }

  async getById(competitionId: string, userId: string) {
    const table: any = await CompetitionTableModel.findById(competitionId).lean();
    if (!table) throw notFound();
    const involved = String(table.owner) === userId || String(table.challenger ?? '') === userId;
    if (table.visibility !== 'public' && !involved) throw forbidden('accès refusé');
    const robotIds = [...(table.ownerRobots ?? []), ...(table.challengerRobots ?? [])];
    const robots = await RobotModel.find({ _id: { $in: robotIds } }).select('name').lean();
    const robotsById = new Map(robots.map((r: any) => [String(r._id), r]));
    return this.serialize(table, robotsById);
  }

  async join(competitionId: string, userId: string, robotIds: string[]) {
    await this.assertOwnedDistinctRobots(userId, robotIds);
    const table = await CompetitionTableModel.findById(competitionId);
    if (!table) throw notFound();
    if (table.status !== 'open') throw conflict('table déjà lancée ou terminée');
    if (String(table.owner) === userId) throw badRequest('vous ne pouvez pas rejoindre votre propre table');

    table.challenger = userId as any;
    table.challengerRobots = robotIds as any;
    table.status = 'running';
    table.queuedAt = new Date();
    await table.save();
    logger.info('challenger rejoint -> match en file', { id: competitionId, challenger: userId });
    this.broadcastChange();

    this.queue.enqueue({ competitionId });
    return this.serialize(table);
  }

  async cancel(competitionId: string, userId: string) {
    const table = await CompetitionTableModel.findById(competitionId);
    if (!table) throw notFound();
    if (String(table.owner) !== userId) throw forbidden('seul le créateur annule');
    if (table.status !== 'open') throw conflict('seules les tables ouvertes peuvent être annulées');
    table.status = 'cancelled';
    await table.save();
    this.broadcastChange();
    return this.serialize(table);
  }

  /** Worker : joue le match en backend puis enregistre le résultat. */
  private async processMatch({ competitionId }: MatchJob) {
    const table: any = await CompetitionTableModel.findById(competitionId);
    if (!table || table.status !== 'running') return;
    table.startedAt = new Date();
    await table.save();

    try {
      const result = await competitionRunner.run({
        competitionId,
        ownerId: String(table.owner),
        manches: table.config?.manches ?? 2,
        lineup: {
          seatRobotIds: [
            String(table.ownerRobots[0]),       // siège 0 — équipe A
            String(table.challengerRobots[0]),  // siège 1 — équipe B
            String(table.ownerRobots[1]),       // siège 2 — équipe A
            String(table.challengerRobots[1]),  // siège 3 — équipe B
          ],
        },
      });
      table.status = 'finished';
      table.game = result.gameId as any;
      table.winner = result.winner;
      table.scoreTeamA = result.scoreTeamA;
      table.scoreTeamB = result.scoreTeamB;
      table.finishedAt = new Date();
      await table.save();
      logger.info('match terminé', { id: competitionId, winner: result.winner });
    } catch (error) {
      // On laisse le match en 'running' : la reprise au démarrage le ré-enfilera.
      logger.error('match en échec (sera repris)', { id: competitionId, error: (error as Error).message });
    }
    this.broadcastChange();
  }

  /** Reprise au démarrage : ré-enfile les matches running sans partie (perte sur crash évitée). */
  async recoverPendingMatches() {
    const stuck = await CompetitionTableModel.find({ status: 'running', game: null }).select('_id').lean();
    for (const table of stuck) this.queue.enqueue({ competitionId: String(table._id) });
    if (stuck.length) logger.info('matches repris', { count: stuck.length });
  }
}

export const competitionService = new CompetitionService();
