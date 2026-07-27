// Economy-balance tests (pure, no DB). Guard KB-300: once stakes ARE applied at
// launch, total staked must relate correctly to total paid out.
import { describe, expect, it } from 'vitest';
import { payoutsByUser, stakesByUser, type GameEconomyContext } from '../../shared/gameEconomy.js';

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

describe('economy — stakes vs payouts (SPEC §3.9)', () => {
  it('4 humans: staked 400, paid 300 to winners (100 house margin)', () => {
    const ctx: GameEconomyContext = { mode: 'online', winner: 'A', seats: [
      { kind: 'human', team: 'A', ownerUserId: 'u1' }, { kind: 'human', team: 'B', ownerUserId: 'u2' },
      { kind: 'human', team: 'A', ownerUserId: 'u3' }, { kind: 'human', team: 'B', ownerUserId: 'u4' },
    ] };
    expect(sum(stakesByUser(ctx))).toBe(400);
    expect(sum(payoutsByUser(ctx))).toBe(300);
    expect(sum(stakesByUser(ctx)) - sum(payoutsByUser(ctx))).toBe(100);
  });
  it('4 robots: staked 200, paid 300 to winning robots’ owners', () => {
    const ctx: GameEconomyContext = { mode: 'online', winner: 'B', seats: [
      { kind: 'robot', team: 'A', robotOwnerUserId: 'o1' }, { kind: 'robot', team: 'B', robotOwnerUserId: 'o2' },
      { kind: 'robot', team: 'A', robotOwnerUserId: 'o3' }, { kind: 'robot', team: 'B', robotOwnerUserId: 'o4' },
    ] };
    expect(sum(stakesByUser(ctx))).toBe(200);
    expect(sum(payoutsByUser(ctx))).toBe(300);
  });
  it('2 humans + 2 robots: winning human gets 225', () => {
    const ctx: GameEconomyContext = { mode: 'online', winner: 'A', seats: [
      { kind: 'human', team: 'A', ownerUserId: 'h1' }, { kind: 'robot', team: 'B', robotOwnerUserId: 'r2' },
      { kind: 'robot', team: 'A', robotOwnerUserId: 'r3' }, { kind: 'human', team: 'B', ownerUserId: 'h4' },
    ] };
    expect(payoutsByUser(ctx).get('h1')).toBe(225);
    expect(payoutsByUser(ctx).get('h4')).toBeUndefined();
  });
  it('local mode: no stake, no payout', () => {
    const ctx: GameEconomyContext = { mode: 'local', winner: 'A', seats: [{ kind: 'human', team: 'A', ownerUserId: 'u1' }] };
    expect(sum(stakesByUser(ctx))).toBe(0);
    expect(sum(payoutsByUser(ctx))).toBe(0);
  });
  it('no winner: no payout even online', () => {
    const ctx: GameEconomyContext = { mode: 'online', winner: null, seats: [{ kind: 'human', team: 'A', ownerUserId: 'u1' }] };
    expect(sum(payoutsByUser(ctx))).toBe(0);
  });
  it('one owner with several robots is staked per robot', () => {
    const ctx: GameEconomyContext = { mode: 'online', winner: 'A', seats: [
      { kind: 'robot', team: 'A', robotOwnerUserId: 'solo' }, { kind: 'robot', team: 'B', robotOwnerUserId: 'solo' },
      { kind: 'robot', team: 'A', robotOwnerUserId: 'solo' }, { kind: 'robot', team: 'B', robotOwnerUserId: 'solo' },
    ] };
    expect(stakesByUser(ctx).get('solo')).toBe(200);
  });
});
