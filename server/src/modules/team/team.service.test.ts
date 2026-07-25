// Integration tests for TeamService — exercises Mongoose models with an
// in-memory MongoDB (see test/setupMongo.ts). Validates role hierarchy,
// the 40-member cap, single-team ownership, and the kick/change-role flow.
import '../../test/setupMongo.js';
import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { TeamService } from './team.service.js';
import { TeamModel, TEAM_MAX_MEMBERS } from './team.model.js';
import { UserModel } from '../user/user.model.js';

const service = new TeamService();

async function newUser(username: string) {
  const passwordHash = await bcrypt.hash('secret', 4);
  const doc = await UserModel.create({ username, passwordHash });
  return String(doc._id);
}

describe('TeamService.create', () => {
  it('creates a team with the founder as owner-member', async () => {
    const uid = await newUser('ameur');
    const { id } = await service.create(uid, 'Alpha');
    const team: any = await TeamModel.findById(id).lean();
    expect(team.name).toBe('Alpha');
    expect(String(team.owner)).toBe(uid);
    expect(team.members).toHaveLength(1);
    expect(team.members[0].role).toBe('owner');
    expect(String(team.members[0].user)).toBe(uid);
  });

  it('refuses to create a SECOND team owned by the same user (SPEC §3.5)', async () => {
    const uid = await newUser('ameur');
    await service.create(uid, 'Alpha');
    await expect(service.create(uid, 'Beta')).rejects.toThrow(/déjà/);
  });

  it('refuses to reuse an existing team name', async () => {
    const uid1 = await newUser('alice');
    const uid2 = await newUser('bob');
    await service.create(uid1, 'Alpha');
    await expect(service.create(uid2, 'Alpha')).rejects.toThrow(/nom déjà pris/);
  });
});

describe('TeamService.addMember + join', () => {
  it('accepts up to TEAM_MAX_MEMBERS (40) and rejects the 41st', async () => {
    const owner = await newUser('owner');
    const { id } = await service.create(owner, 'BigTeam');
    // Add 39 members (owner already counts, total = 40).
    for (let i = 0; i < TEAM_MAX_MEMBERS - 1; i++) {
      const uid = await newUser(`u${i}`);
      await service.addMember(id, owner, uid, 'user');
    }
    const team: any = await TeamModel.findById(id).lean();
    expect(team.members).toHaveLength(TEAM_MAX_MEMBERS);
    // 41st is rejected.
    const overflow = await newUser('overflow');
    await expect(service.addMember(id, owner, overflow, 'user')).rejects.toThrow(/limite/);
  });

  it('a user role cannot invite anyone', async () => {
    const owner = await newUser('owner');
    const invitee = await newUser('invitee');
    const plain = await newUser('plain');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, plain, 'user');
    await expect(service.addMember(id, plain, invitee, 'user')).rejects.toThrow(/ne pouvez pas inviter/);
  });

  it('super cannot promote to super (role protection)', async () => {
    const owner = await newUser('owner');
    const sup = await newUser('sup');
    const target = await newUser('target');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, sup, 'super');
    await service.addMember(id, owner, target, 'user');
    await expect(service.changeRole(id, sup, target, 'super')).rejects.toThrow(/autorité/);
  });
});

describe('TeamService.kickMember', () => {
  it('owner can kick a super', async () => {
    const owner = await newUser('owner');
    const sup = await newUser('sup');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, sup, 'super');
    await service.kickMember(id, owner, sup);
    const team: any = await TeamModel.findById(id).lean();
    expect(team.members.find((m: any) => String(m.user) === sup)).toBeUndefined();
  });

  it('admin cannot kick another admin', async () => {
    const owner = await newUser('owner');
    const a1 = await newUser('a1');
    const a2 = await newUser('a2');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, a1, 'admin');
    await service.addMember(id, owner, a2, 'admin');
    await expect(service.kickMember(id, a1, a2)).rejects.toThrow(/autorité/);
  });

  it('user cannot kick anyone', async () => {
    const owner = await newUser('owner');
    const u = await newUser('u');
    const other = await newUser('other');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, u, 'user');
    await service.addMember(id, owner, other, 'user');
    await expect(service.kickMember(id, u, other)).rejects.toThrow(/autorité/);
  });

  it('nobody can kick the owner (owner is untouchable)', async () => {
    const owner = await newUser('owner');
    const sup = await newUser('sup');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, sup, 'super');
    await expect(service.kickMember(id, sup, owner)).rejects.toThrow(/autorité/);
  });
});

describe('TeamService.changeRole', () => {
  it('owner can promote a user to admin', async () => {
    const owner = await newUser('owner');
    const u = await newUser('u');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, u, 'user');
    await service.changeRole(id, owner, u, 'admin');
    const team: any = await TeamModel.findById(id).lean();
    expect(team.members.find((m: any) => String(m.user) === u).role).toBe('admin');
  });

  it('owner role is protected — nobody can assign it via changeRole', async () => {
    const owner = await newUser('owner');
    const sup = await newUser('sup');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, sup, 'super');
    await expect(service.changeRole(id, owner, sup, 'owner')).rejects.toThrow(/owner/);
  });
});

describe('TeamService.update (rename / visibility)', () => {
  it('owner and super can rename; admin/user cannot', async () => {
    const owner = await newUser('owner');
    const sup = await newUser('sup');
    const adm = await newUser('adm');
    const { id } = await service.create(owner, 'Alpha');
    await service.addMember(id, owner, sup, 'super');
    await service.addMember(id, owner, adm, 'admin');
    await service.update(id, sup, { name: 'Beta' });
    const t1: any = await TeamModel.findById(id).lean();
    expect(t1.name).toBe('Beta');
    await expect(service.update(id, adm, { name: 'Gamma' })).rejects.toThrow(/renommage/);
  });

  it('only owner can change visibility', async () => {
    const owner = await newUser('owner');
    const sup = await newUser('sup');
    const { id } = await service.create(owner, 'Alpha');
    await service.addMember(id, owner, sup, 'super');
    await expect(service.update(id, sup, { visibility: 'public' })).rejects.toThrow(/owner/);
  });
});

describe('TeamService.leave', () => {
  it('regular members can leave the team', async () => {
    const owner = await newUser('owner');
    const u = await newUser('u');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, u, 'user');
    await service.leave(u, id);
    const team: any = await TeamModel.findById(id).lean();
    expect(team.members.find((m: any) => String(m.user) === u)).toBeUndefined();
  });

  it('owner cannot leave without dissolving/transfer (protection)', async () => {
    const owner = await newUser('owner');
    const { id } = await service.create(owner, 'T');
    await expect(service.leave(owner, id)).rejects.toThrow(/owner/);
  });
});

describe('TeamService.getDetail', () => {
  it('reports the viewer role in myRole', async () => {
    const owner = await newUser('owner');
    const u = await newUser('u');
    const { id } = await service.create(owner, 'T');
    await service.addMember(id, owner, u, 'admin');
    const detail = await service.getDetail(id, u);
    expect(detail.myRole).toBe('admin');
    expect(detail.members).toHaveLength(2);
  });
});
