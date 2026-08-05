// @vitest-environment happy-dom
// Tests for SessionCache — one-time load, targeted refresh, offline resilience.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionCache } from './SessionCache';
import { EventBus } from '../core/EventBus';
import { persistClearAll } from './persistentStorage';
import type { ApiClient, ServerRobot } from './ApiClient';

function fakeApi(overrides: Partial<ApiClient> = {}): ApiClient {
  const base = {
    isAuthenticated: () => true,
    me: vi.fn(async () => ({ user: { id: 'u1', username: 'ameur', email: null } })),
    wallet: vi.fn(async () => ({ balance: 2480, canClaimToday: true, lastClaimDay: null, transactions: [] })),
    getVipStatus: vi.fn(async () => ({ expiresAt: null })),
    listRobots: vi.fn(async () => ({ robots: [{ id: 'r1', name: 'Atné' } as ServerRobot] })),
  };
  return { ...base, ...overrides } as unknown as ApiClient;
}

beforeEach(() => { persistClearAll(); localStorage.clear(); });

describe('SessionCache — chargement initial', () => {
  it('loadAll peuple profil, wallet, VIP et robots', async () => {
    const api = fakeApi();
    const cache = new SessionCache(api, new EventBus());
    await cache.loadAll();
    expect(cache.profile?.username).toBe('ameur');
    expect(cache.wallet?.balance).toBe(2480);
    expect(cache.vip.isVip).toBe(false);
    expect(cache.robots).toHaveLength(1);
    expect(cache.hydrated).toBe(true);
  });

  it('ne charge rien si non authentifié', async () => {
    const api = fakeApi({ isAuthenticated: () => false });
    const cache = new SessionCache(api, new EventBus());
    await cache.loadAll();
    expect(cache.profile).toBeNull();
    expect(cache.hydrated).toBe(false);
  });
});

describe('SessionCache — persistance', () => {
  it('un second cache lit les valeurs persistées par le premier (démarrage instantané)', async () => {
    const bus = new EventBus();
    const first = new SessionCache(fakeApi(), bus);
    await first.loadAll();
    // Nouveau cache (simulant une réouverture de l'app) : hydraté depuis le disque.
    const second = new SessionCache(fakeApi(), bus);
    expect(second.wallet?.balance).toBe(2480);
    expect(second.robots).toHaveLength(1);
    expect(second.profile?.username).toBe('ameur');
  });
});

describe('SessionCache — refresh ciblé + événements', () => {
  it('refreshWallet émet session:wallet avec le nouveau solde', async () => {
    const bus = new EventBus();
    let received: unknown = null;
    bus.on('session:wallet', (w) => { received = w; });
    const api = fakeApi({ wallet: vi.fn(async () => ({ balance: 999, canClaimToday: false, lastClaimDay: null, transactions: [] })) });
    const cache = new SessionCache(api, bus);
    await cache.refreshWallet();
    expect(cache.wallet?.balance).toBe(999);
    expect((received as { balance: number }).balance).toBe(999);
  });

  it('applyVip calcule isVip depuis une expiration future', () => {
    const cache = new SessionCache(fakeApi(), new EventBus());
    const future = new Date(Date.now() + 86_400_000).toISOString();
    cache.applyVip(future);
    expect(cache.isVip).toBe(true);
    const past = new Date(Date.now() - 1000).toISOString();
    cache.applyVip(past);
    expect(cache.isVip).toBe(false);
  });
});

describe('SessionCache — résilience hors-ligne', () => {
  it('garde la dernière valeur connue si le refresh échoue', async () => {
    const bus = new EventBus();
    const okApi = fakeApi();
    const cache = new SessionCache(okApi, bus);
    await cache.loadAll();
    expect(cache.wallet?.balance).toBe(2480);

    // Simule une panne réseau sur le wallet.
    (okApi.wallet as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('offline'));
    await cache.refreshWallet();
    // La valeur précédente est conservée (pas de remise à zéro).
    expect(cache.wallet?.balance).toBe(2480);
  });

  it('canPlayOffline vrai dès qu\'il y a des robots en cache', async () => {
    const cache = new SessionCache(fakeApi(), new EventBus());
    expect(cache.canPlayOffline).toBe(false);
    await cache.refreshRobots();
    expect(cache.canPlayOffline).toBe(true);
  });
});

describe('SessionCache — déconnexion', () => {
  it('clear efface tout et émet session:cleared', async () => {
    const bus = new EventBus();
    let cleared = false;
    bus.on('session:cleared', () => { cleared = true; });
    const cache = new SessionCache(fakeApi(), bus);
    await cache.loadAll();
    cache.clear();
    expect(cache.profile).toBeNull();
    expect(cache.robots).toHaveLength(0);
    expect(cache.hydrated).toBe(false);
    expect(cleared).toBe(true);
    // Un nouveau cache ne retrouve rien (persistance effacée).
    const fresh = new SessionCache(fakeApi(), bus);
    expect(fresh.wallet).toBeNull();
  });
});
