// Integration tests for WalletService: daily reward + stake + payout.
import '../../test/setupMongo.js';
import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { walletService, todayIso } from './wallet.service.js';
import { UserModel } from '../user/user.model.js';
import { DAILY_REWARD } from '../../shared/gameEconomy.js';

async function newUser(username = 'demo') {
  const passwordHash = await bcrypt.hash('secret', 4);
  const doc = await UserModel.create({ username, passwordHash });
  return String(doc._id);
}

describe('WalletService.claimDaily', () => {
  it('credits 500 tokens on the first claim of the day', async () => {
    const uid = await newUser();
    const before = await walletService.getMyWallet(uid);
    expect(before.balance).toBe(0);
    expect(before.canClaimToday).toBe(true);

    const claim = await walletService.claimDaily(uid);
    expect(claim.claimed).toBe(true);
    expect(claim.balance).toBe(DAILY_REWARD);

    const after = await walletService.getMyWallet(uid);
    expect(after.balance).toBe(DAILY_REWARD);
    expect(after.canClaimToday).toBe(false);
    expect(after.lastClaimDay).toBe(todayIso());
    expect(after.transactions.find((t: any) => t.kind === 'daily')).toBeTruthy();
  });

  it('refuses a second claim on the same day (idempotent)', async () => {
    const uid = await newUser();
    await walletService.claimDaily(uid);
    await expect(walletService.claimDaily(uid)).rejects.toThrow(/déjà/);
  });
});

describe('WalletService.stake', () => {
  it('debits the amount and records a game_stake transaction', async () => {
    const uid = await newUser();
    await walletService.claimDaily(uid); // balance = 500
    await walletService.stake(uid, 100);
    const wallet = await walletService.getMyWallet(uid);
    expect(wallet.balance).toBe(DAILY_REWARD - 100);
    const stakeEntry = wallet.transactions.find((t: any) => t.kind === 'game_stake');
    expect(stakeEntry).toBeTruthy();
    expect(stakeEntry!.amount).toBe(-100);
  });

  it('refuses stake if the balance is insufficient', async () => {
    const uid = await newUser();
    await expect(walletService.stake(uid, 100)).rejects.toThrow(/insuffisant/);
  });

  it('rejects invalid amounts (zero or negative)', async () => {
    const uid = await newUser();
    await expect(walletService.stake(uid, 0)).rejects.toThrow(/montant/);
    await expect(walletService.stake(uid, -10)).rejects.toThrow(/montant/);
  });
});

describe('WalletService.credit', () => {
  it('credits a payout and records it as game_win', async () => {
    const uid = await newUser();
    await walletService.credit(uid, 225);
    const wallet = await walletService.getMyWallet(uid);
    expect(wallet.balance).toBe(225);
    const winEntry = wallet.transactions.find((t: any) => t.kind === 'game_win');
    expect(winEntry?.amount).toBe(225);
  });

  it('is a no-op when amount is zero or negative', async () => {
    const uid = await newUser();
    await walletService.credit(uid, 0);
    const wallet = await walletService.getMyWallet(uid);
    expect(wallet.balance).toBe(0);
    expect(wallet.transactions).toHaveLength(0);
  });
});
