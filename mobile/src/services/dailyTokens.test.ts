// Tests unitaires — récompense quotidienne de 500 jetons.
// Utilise un shim localStorage in-memory pour isoler chaque test.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DAILY_TOKENS, canClaimToday, claimDailyTokens, spendTokens, tokenBalance } from './dailyTokens';

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
});

describe('dailyTokens', () => {
  it('solde initial = 0', () => {
    expect(tokenBalance()).toBe(0);
  });

  it('peut être réclamé aujourd\'hui la première fois', () => {
    expect(canClaimToday()).toBe(true);
    const r = claimDailyTokens();
    expect(r.claimed).toBe(true);
    expect(r.balance).toBe(DAILY_TOKENS);
    expect(tokenBalance()).toBe(DAILY_TOKENS);
  });

  it('ne peut pas être réclamé deux fois le même jour', () => {
    claimDailyTokens('2026-07-21');
    const r = claimDailyTokens('2026-07-21');
    expect(r.claimed).toBe(false);
    expect(r.balance).toBe(DAILY_TOKENS);
    expect(canClaimToday('2026-07-21')).toBe(false);
  });

  it('peut à nouveau être réclamé le lendemain (cumul)', () => {
    claimDailyTokens('2026-07-21');
    const r = claimDailyTokens('2026-07-22');
    expect(r.claimed).toBe(true);
    expect(r.balance).toBe(DAILY_TOKENS * 2);
  });

  it('spendTokens échoue si le solde est insuffisant', () => {
    const r = spendTokens(100);
    expect(r.ok).toBe(false);
    expect(r.balance).toBe(0);
  });

  it('spendTokens débite quand suffisant', () => {
    claimDailyTokens('2026-07-21');
    const r = spendTokens(150);
    expect(r.ok).toBe(true);
    expect(r.balance).toBe(DAILY_TOKENS - 150);
    expect(tokenBalance()).toBe(DAILY_TOKENS - 150);
  });
});
