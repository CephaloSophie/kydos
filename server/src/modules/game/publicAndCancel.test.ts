// Integration tests — cancel pending table (SPEC §3.8) and public replay
// search by participant name (SPEC §3.10). Runs with MONGOMS_AVAILABLE=1.
import '../../test/setupMongo.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { TableService } from '../table/table.service.js';
import { TableModel } from '../table/table.model.js';
import { UserModel } from '../user/user.model.js';
import { GameModel } from './game.model.js';
import { GameReplayModel } from './gameReplay.model.js';
import { gameQueryService } from './gameQuery.service.js';
import { singleGameLockService } from './singleGameLock.service.js';

const tableService = new TableService();

async function newUser(username: string) {
  const passwordHash = await bcrypt.hash('secret', 4);
  const doc = await UserModel.create({ username, passwordHash });
  return String(doc._id);
}

describe('TableService.cancelPending (SPEC §3.8)', () => {
  it('owner can cancel a lobby table with free seats; locks are released', async () => {
    const owner = await newUser('owner');
    const created = await tableService.createTable(owner, { visibility: 'public', kind: 'royal' });
    const tableId = created.id;
    // The creator sits at seat 0 at creation → lock acquired by changeSeat in
    // real flows; simulate it here.
    await singleGameLockService.acquire(owner, tableId);

    await tableService.cancelPending(tableId, owner);

    const doc: any = await TableModel.findById(tableId).lean();
    expect(doc.status).toBe('draft');
    expect(doc.seats.every((s: any) => s.kind === 'empty')).toBe(true);
    expect(await singleGameLockService.activeSessionOf(owner)).toBeNull();
  });

  it('non-owner cannot cancel', async () => {
    const owner = await newUser('owner');
    const other = await newUser('other');
    const created = await tableService.createTable(owner, { visibility: 'public', kind: 'royal' });
    await expect(tableService.cancelPending(created.id, other)).rejects.toThrow(/créateur/);
  });

  it('refuses to cancel once the table is FULL (all 4 seats taken)', async () => {
    const owner = await newUser('owner');
    const created = await tableService.createTable(owner, { visibility: 'public', kind: 'royal' });
    const tableId = created.id;
    // Fill the remaining 3 seats with pseudo-robots directly in DB.
    const doc: any = await TableModel.findById(tableId);
    for (const seat of doc.seats) {
      if (seat.kind === 'empty') Object.assign(seat, { kind: 'robot', name: 'Bot', robot: new mongoose.Types.ObjectId() });
    }
    await doc.save();
    await expect(tableService.cancelPending(tableId, owner)).rejects.toThrow(/complète/);
  });
});

describe('gameQueryService.listPublicByName (SPEC §3.10)', () => {
  it('finds PUBLIC games matching a participant name (case-insensitive)', async () => {
    const gameId = new mongoose.Types.ObjectId();
    await GameReplayModel.create({ _id: gameId, game: gameId, replay: { donnes: [] }, publicNames: ['Ameur', 'Atné'] });
    await GameModel.create({ _id: gameId, visibility: 'public', mode: 'online', winner: 'A', participants: [{ seatIndex: 0, team: 'A', type: 'human', name: 'Ameur' }] });

    const found = await gameQueryService.listPublicByName('atné');
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe(String(gameId));
    expect(found[0].participants[0].name).toBe('Ameur');
  });

  it('never returns PRIVATE games even when the name matches', async () => {
    const gameId = new mongoose.Types.ObjectId();
    await GameReplayModel.create({ _id: gameId, game: gameId, replay: { donnes: [] }, publicNames: ['Secret'] });
    await GameModel.create({ _id: gameId, visibility: 'private', mode: 'online', winner: 'B', participants: [] });

    expect(await gameQueryService.listPublicByName('secret')).toHaveLength(0);
  });

  it('empty query yields an empty list', async () => {
    expect(await gameQueryService.listPublicByName('')).toEqual([]);
    expect(await gameQueryService.listPublicByName('   ')).toEqual([]);
  });
});
