// Tests InMemoryQueue + RedisQueue (via fake client) : FIFO strict, remove, peek.
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryQueue, RedisQueue, type MatchmakingTicket, type RedisClient } from './queue.js';

function ticket(userId: string): MatchmakingTicket {
  return { userId, robotIds: [], enqueuedAt: Date.now() };
}

/**
 * Fake client Redis minimal pour tester RedisQueue sans démarrer un serveur.
 * Implémente LPUSH / RPOP / LRANGE / LLEN / DEL avec la même sémantique.
 */
function fakeRedis(): RedisClient {
  const store = new Map<string, string[]>();
  const get = (k: string) => { let v = store.get(k); if (!v) { v = []; store.set(k, v); } return v; };
  return {
    async lpush(k, v) { const list = get(k); list.unshift(v); return list.length; },
    async rpop(k, count = 1) {
      const list = get(k);
      if (list.length === 0) return null;
      const out: string[] = [];
      for (let i = 0; i < count && list.length > 0; i++) out.push(list.pop()!);
      return count === 1 ? out[0] : out;
    },
    async llen(k) { return get(k).length; },
    async lrange(k, start, stop) {
      const list = get(k);
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    },
    async del(k) { const had = store.has(k); store.delete(k); return had ? 1 : 0; },
    async quit() { return 'OK' as const; },
  };
}

describe('InMemoryQueue — FIFO', () => {
  let q: InMemoryQueue;
  beforeEach(() => { q = new InMemoryQueue(); });

  it('push + pop respecte l\'ordre FIFO', async () => {
    await q.push('duo', ticket('alice'));
    await q.push('duo', ticket('bob'));
    await q.push('duo', ticket('carla'));
    const out = await q.pop('duo', 2);
    expect(out.map((t) => t.userId)).toEqual(['alice', 'bob']);
    expect(await q.size('duo')).toBe(1);
  });

  it('pop rend moins d\'éléments si la file est trop courte', async () => {
    await q.push('duo', ticket('alice'));
    const out = await q.pop('duo', 4);
    expect(out).toHaveLength(1);
    expect(await q.size('duo')).toBe(0);
  });

  it('remove retire un utilisateur précis sans perturber les autres', async () => {
    await q.push('duo', ticket('alice'));
    await q.push('duo', ticket('bob'));
    await q.push('duo', ticket('carla'));
    expect(await q.remove('duo', 'bob')).toBe(true);
    const out = await q.pop('duo', 3);
    expect(out.map((t) => t.userId)).toEqual(['alice', 'carla']);
  });

  it('remove renvoie false si l\'utilisateur n\'est pas trouvé', async () => {
    await q.push('duo', ticket('alice'));
    expect(await q.remove('duo', 'ghost')).toBe(false);
  });

  it('les clés (formats) sont isolées', async () => {
    await q.push('duo', ticket('a'));
    await q.push('royal', ticket('b'));
    expect(await q.size('duo')).toBe(1);
    expect(await q.size('royal')).toBe(1);
    await q.pop('duo', 1);
    expect(await q.size('duo')).toBe(0);
    expect(await q.size('royal')).toBe(1);
  });

  it('peek lit sans muter', async () => {
    await q.push('duo', ticket('a'));
    await q.push('duo', ticket('b'));
    const p1 = await q.peek('duo');
    const p2 = await q.peek('duo');
    expect(p1.map((t) => t.userId)).toEqual(['a', 'b']);
    expect(p2.map((t) => t.userId)).toEqual(['a', 'b']);
    expect(await q.size('duo')).toBe(2);
  });
});

describe('RedisQueue (fake client) — parité FIFO avec InMemory', () => {
  let q: RedisQueue;
  beforeEach(() => { q = new RedisQueue(fakeRedis(), 'test:'); });

  it('push + pop respecte FIFO malgré LPUSH/RPOP', async () => {
    await q.push('duo', ticket('alice'));
    await q.push('duo', ticket('bob'));
    await q.push('duo', ticket('carla'));
    const out = await q.pop('duo', 2);
    expect(out.map((t) => t.userId)).toEqual(['alice', 'bob']);
    expect(await q.size('duo')).toBe(1);
  });

  it('peek natif reflète l\'ordre FIFO chronologique', async () => {
    await q.push('duo', ticket('alice'));
    await q.push('duo', ticket('bob'));
    const p = await q.peek('duo');
    expect(p.map((t) => t.userId)).toEqual(['alice', 'bob']);
    expect(await q.size('duo')).toBe(2);
  });

  it('remove reconstruit la file sans l\'utilisateur', async () => {
    await q.push('duo', ticket('a'));
    await q.push('duo', ticket('b'));
    await q.push('duo', ticket('c'));
    expect(await q.remove('duo', 'b')).toBe(true);
    const out = await q.pop('duo', 3);
    expect(out.map((t) => t.userId)).toEqual(['a', 'c']);
  });

  it('peek avec limite', async () => {
    await q.push('duo', ticket('a'));
    await q.push('duo', ticket('b'));
    await q.push('duo', ticket('c'));
    const p = await q.peek('duo', 2);
    expect(p.map((t) => t.userId)).toEqual(['a', 'b']);
  });
});
