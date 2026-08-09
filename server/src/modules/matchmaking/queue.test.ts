// Tests InMemoryQueue : FIFO strict, remove ciblé, size.
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryQueue, type MatchmakingTicket } from './queue.js';

function ticket(userId: string): MatchmakingTicket {
  return { userId, robotIds: [], enqueuedAt: Date.now() };
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
});
