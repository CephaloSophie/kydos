// Unit tests — mobile wallet service (SERVER-FIRST with local fallback).
// Uses vi.spyOn on the ApiClient so no network is required.
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Local (fallback) storage mock — same shim as dailyTokens.test.
const memStore = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => m.clear(),
    key: () => null, get length() { return m.size; },
  } as Storage;
};

beforeEach(() => {
  vi.stubGlobal('localStorage', memStore());
  vi.resetAllMocks();
});

describe('wallet service', () => {
  it('when unauthenticated, reads and claims LOCAL (localStorage)', async () => {
    const { api } = await import('../data/ApiClient');
    const { claimDaily, readWallet } = await import('./wallet');
    vi.spyOn(api, 'isAuthenticated').mockReturnValue(false);

    let w = await readWallet();
    expect(w.source).toBe('local');
    expect(w.balance).toBe(0);
    expect(w.canClaim).toBe(true);

    const r = await claimDaily();
    expect(r.claimed).toBe(true);
    expect(r.balance).toBe(500);
    expect(r.source).toBe('local');

    w = await readWallet();
    expect(w.balance).toBe(500);
    expect(w.canClaim).toBe(false);
  });

  it('when authenticated, prefers SERVER answers', async () => {
    const { api } = await import('../data/ApiClient');
    const { claimDaily, readWallet } = await import('./wallet');
    vi.spyOn(api, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(api, 'wallet').mockResolvedValue({ balance: 1200, canClaimToday: false, lastClaimDay: '2026-07-22', transactions: [] });
    vi.spyOn(api, 'claimDailyTokens').mockResolvedValue({ claimed: false, balance: 1200, reward: 500 });

    const w = await readWallet();
    expect(w.source).toBe('server');
    expect(w.balance).toBe(1200);
    expect(w.canClaim).toBe(false);

    const r = await claimDaily();
    expect(r.claimed).toBe(false);
    expect(r.source).toBe('server');
  });

  it('falls back to LOCAL when the server call fails', async () => {
    const { api } = await import('../data/ApiClient');
    const { claimDaily, readWallet } = await import('./wallet');
    vi.spyOn(api, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(api, 'wallet').mockRejectedValue(new Error('offline'));
    vi.spyOn(api, 'claimDailyTokens').mockRejectedValue(new Error('offline'));

    const w = await readWallet();
    expect(w.source).toBe('local');
    expect(w.balance).toBe(0);

    const r = await claimDaily();
    expect(r.claimed).toBe(true);
    expect(r.balance).toBe(500);
    expect(r.source).toBe('local');
  });
});
