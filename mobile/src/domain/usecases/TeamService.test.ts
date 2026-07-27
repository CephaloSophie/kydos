// @vitest-environment happy-dom
// Unit tests for TeamService (domain use-cases) against the fake server.
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { calls, installFakeServer } from '../../test/fakeServer';
import { EventBus } from '../../core/EventBus';
import { ApiClient } from '../../data/ApiClient';
import { TeamService } from './TeamService';

let uninstall: () => void;
let bus: EventBus;
let svc: TeamService;

beforeEach(() => {
  uninstall = installFakeServer();
  localStorage.setItem('kydos.mobile.token', 'test.jwt.token');
  bus = new EventBus();
  svc = new TeamService(new ApiClient(), bus);
  calls.length = 0;
});
afterEach(() => { uninstall(); localStorage.clear(); });

describe('TeamService — lectures', () => {
  it('list() interroge /teams', async () => {
    const teams = await svc.list();
    expect(Array.isArray(teams)).toBe(true);
    expect(calls.some((c) => c.path === '/teams')).toBe(true);
  });
  it('mine() interroge /teams/mine', async () => {
    await svc.mine();
    expect(calls.some((c) => c.path === '/teams/mine')).toBe(true);
  });
  it('searchUsers() interroge /users/search', async () => {
    const users = await svc.searchUsers('al');
    expect(users.length).toBeGreaterThan(0);
    expect(calls.some((c) => c.path.startsWith('/users/search'))).toBe(true);
  });
});

describe('TeamService — invitations émettent invitations:changed', () => {
  it('invite() poste et émet', async () => {
    const spy = vi.fn(); bus.on('invitations:changed', spy);
    await svc.invite('t_1', 'Alpha');
    expect(calls.some((c) => c.method === 'POST' && /\/teams\/[^/]+\/invite/.test(c.path))).toBe(true);
    expect(spy).toHaveBeenCalled();
  });
  it('acceptInvitation() émet invitations:changed ET teams:changed', async () => {
    const inv = vi.fn(); const team = vi.fn();
    bus.on('invitations:changed', inv); bus.on('teams:changed', team);
    await svc.acceptInvitation('inv_r1');
    expect(inv).toHaveBeenCalled(); expect(team).toHaveBeenCalled();
  });
  it('cancelInvitation() poste /cancel', async () => {
    await svc.cancelInvitation('inv_s1');
    expect(calls.some((c) => /\/invitations\/[^/]+\/cancel/.test(c.path))).toBe(true);
  });
  it('countInvitations() lit le compteur', async () => {
    const n = await svc.countInvitations();
    expect(typeof n).toBe('number');
    expect(calls.some((c) => c.path === '/invitations/count')).toBe(true);
  });
});

describe('TeamService — mutations émettent teams:changed', () => {
  it('create() poste /teams et émet', async () => {
    const spy = vi.fn(); bus.on('teams:changed', spy);
    await svc.create('Nouvelle');
    expect(calls.some((c) => c.method === 'POST' && c.path === '/teams')).toBe(true);
    expect(spy).toHaveBeenCalled();
  });
});
