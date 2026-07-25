// Integration tests for the single-game lock (SPEC §3.8).
import '../../test/setupMongo.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { SingleGameLockService } from './singleGameLock.service.js';
import { UserModel } from '../user/user.model.js';

const service = new SingleGameLockService();

async function newUser() {
  const passwordHash = await bcrypt.hash('secret', 4);
  const doc = await UserModel.create({ username: `u${Math.random().toString(36).slice(2, 8)}`, passwordHash });
  return String(doc._id);
}

describe('SingleGameLockService', () => {
  it('starts unlocked (activeSession = null)', async () => {
    const uid = await newUser();
    expect(await service.activeSessionOf(uid)).toBeNull();
  });

  it('acquire stores the sessionId on the user document', async () => {
    const uid = await newUser();
    const sid = String(new mongoose.Types.ObjectId());
    await service.acquire(uid, sid);
    expect(await service.activeSessionOf(uid)).toBe(sid);
  });

  it('acquiring the SAME session again is idempotent', async () => {
    const uid = await newUser();
    const sid = String(new mongoose.Types.ObjectId());
    await service.acquire(uid, sid);
    await expect(service.acquire(uid, sid)).resolves.toBeUndefined();
  });

  it('acquiring a DIFFERENT session throws (one-game-at-a-time)', async () => {
    const uid = await newUser();
    const sid1 = String(new mongoose.Types.ObjectId());
    const sid2 = String(new mongoose.Types.ObjectId());
    await service.acquire(uid, sid1);
    await expect(service.acquire(uid, sid2)).rejects.toThrow(/déjà engagé/);
  });

  it('release frees the user', async () => {
    const uid = await newUser();
    const sid = String(new mongoose.Types.ObjectId());
    await service.acquire(uid, sid);
    await service.release(uid);
    expect(await service.activeSessionOf(uid)).toBeNull();
  });

  it('releaseAllOf frees every user tied to the same session', async () => {
    const sid = String(new mongoose.Types.ObjectId());
    const u1 = await newUser();
    const u2 = await newUser();
    const u3 = await newUser();
    await service.acquire(u1, sid);
    await service.acquire(u2, sid);
    const otherSid = String(new mongoose.Types.ObjectId());
    await service.acquire(u3, otherSid);

    await service.releaseAllOf(sid);
    expect(await service.activeSessionOf(u1)).toBeNull();
    expect(await service.activeSessionOf(u2)).toBeNull();
    // u3 was on a different session — unaffected.
    expect(await service.activeSessionOf(u3)).toBe(otherSid);
  });
});
