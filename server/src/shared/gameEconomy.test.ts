// Unit tests for the pure game economy calculator (SPEC §3.9).
import { describe, expect, it } from 'vitest';
import {
  HUMAN_STAKE, ROBOT_STAKE, DAILY_REWARD,
  stakeForSeat, stakesByUser, payoutsByUser,
  type GameEconomyContext, type SeatEconomy,
} from './gameEconomy.js';

const seat = (kind: 'human' | 'robot', team: 'A' | 'B', ownerUserId?: string, robotOwnerUserId?: string): SeatEconomy => ({ kind, team, ownerUserId, robotOwnerUserId });

describe('stakeForSeat', () => {
  it('local mode is FREE for everyone', () => {
    const ctx: GameEconomyContext = { mode: 'local', seats: [], winner: null };
    expect(stakeForSeat(ctx, seat('human', 'A', 'u1'))).toBe(0);
    expect(stakeForSeat(ctx, seat('robot', 'B'))).toBe(0);
  });

  it('online: humans pay 100, robots 50', () => {
    const ctx: GameEconomyContext = { mode: 'online', seats: [], winner: null };
    expect(stakeForSeat(ctx, seat('human', 'A', 'u1'))).toBe(HUMAN_STAKE);
    expect(stakeForSeat(ctx, seat('robot', 'B'))).toBe(ROBOT_STAKE);
  });
});

describe('stakesByUser', () => {
  it('sums human stakes AND robot stakes owed by the user', () => {
    const ctx: GameEconomyContext = {
      mode: 'online',
      seats: [
        seat('human', 'A', 'u1'),
        seat('robot', 'A', undefined, 'u1'), // own robot
        seat('human', 'B', 'u2'),
        seat('robot', 'B', undefined, 'u2'),
      ],
      winner: null,
    };
    const s = stakesByUser(ctx);
    expect(s.get('u1')).toBe(HUMAN_STAKE + ROBOT_STAKE); // 150
    expect(s.get('u2')).toBe(HUMAN_STAKE + ROBOT_STAKE); // 150
  });

  it('local mode: no stake at all', () => {
    const ctx: GameEconomyContext = { mode: 'local', seats: [seat('human', 'A', 'u1')], winner: null };
    expect(stakesByUser(ctx).size).toBe(0);
  });
});

describe('payoutsByUser — SPEC §3.9', () => {
  it('4 humans → 150 for each winning human', () => {
    const ctx: GameEconomyContext = {
      mode: 'online',
      seats: [seat('human', 'A', 'u1'), seat('human', 'B', 'u2'), seat('human', 'A', 'u3'), seat('human', 'B', 'u4')],
      winner: 'A',
    };
    const p = payoutsByUser(ctx);
    expect(p.get('u1')).toBe(150);
    expect(p.get('u3')).toBe(150);
    expect(p.get('u2')).toBeUndefined();
    expect(p.get('u4')).toBeUndefined();
  });

  it('2 humans + 2 robots → 225 for the winning human', () => {
    const ctx: GameEconomyContext = {
      mode: 'online',
      seats: [
        seat('human', 'A', 'u1'),
        seat('robot', 'B', undefined, 'u2'),
        seat('robot', 'A', undefined, 'u1'),
        seat('human', 'B', 'u2'),
      ],
      winner: 'A',
    };
    const p = payoutsByUser(ctx);
    expect(p.get('u1')).toBe(225);
    expect(p.get('u2')).toBeUndefined();
  });

  it('4 robots → 150 for each winning robot OWNER', () => {
    const ctx: GameEconomyContext = {
      mode: 'online',
      seats: [
        seat('robot', 'A', undefined, 'u1'),
        seat('robot', 'B', undefined, 'u2'),
        seat('robot', 'A', undefined, 'u1'),
        seat('robot', 'B', undefined, 'u2'),
      ],
      winner: 'A',
    };
    const p = payoutsByUser(ctx);
    expect(p.get('u1')).toBe(300); // 150 × 2 winning robots owned
    expect(p.get('u2')).toBeUndefined();
  });

  it('local mode: no payout ever', () => {
    const ctx: GameEconomyContext = {
      mode: 'local',
      seats: [seat('human', 'A', 'u1'), seat('robot', 'B', undefined, 'u1')],
      winner: 'A',
    };
    expect(payoutsByUser(ctx).size).toBe(0);
  });

  it('null winner: no payout', () => {
    const ctx: GameEconomyContext = {
      mode: 'online',
      seats: [seat('human', 'A', 'u1'), seat('human', 'B', 'u2'), seat('human', 'A', 'u3'), seat('human', 'B', 'u4')],
      winner: null,
    };
    expect(payoutsByUser(ctx).size).toBe(0);
  });
});

describe('constants', () => {
  it('spec-mandated values are locked in', () => {
    expect(HUMAN_STAKE).toBe(100);
    expect(ROBOT_STAKE).toBe(50);
    expect(DAILY_REWARD).toBe(500);
  });
});
