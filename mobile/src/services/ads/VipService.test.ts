// @vitest-environment happy-dom
// Tests for VipService: purchase durations, extension, VIP eligibility, debit.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VipService, VIP_PLANS, type VipApi, type SpendTokens } from './VipService';

const localApi: VipApi = { isAuthenticated: () => false };

/** Fake spend that just tracks calls and always succeeds. */
function makeSpend(): { spend: SpendTokens; calls: number[] } {
  const calls: number[] = [];
  const spend: SpendTokens = async (amount) => { calls.push(amount); return { balance: 1_000_000 }; };
  return { spend, calls };
}

beforeEach(() => localStorage.clear());

describe('VIP_PLANS — barème', () => {
  it('expose les 3 paliers demandés (600/1j, 4500/10j, 30000/30j)', () => {
    expect(VIP_PLANS).toEqual([
      { id: 'day', label: '1 jour', costTokens: 600, durationDays: 1 },
      { id: 'days10', label: '10 jours', costTokens: 4500, durationDays: 10 },
      { id: 'days30', label: '30 jours', costTokens: 30000, durationDays: 30 },
    ]);
  });
});

describe('VipService — statut & achat', () => {
  it('non-VIP par défaut', async () => {
    const s = await new VipService(localApi).status();
    expect(s.isVip).toBe(false);
    expect(s.expiresAt).toBeNull();
  });

  it('achat 1 jour → VIP actif ET jetons débités de 600', async () => {
    const { spend, calls } = makeSpend();
    const svc = new VipService(localApi, spend);
    const before = Date.now();
    const s = await svc.purchase('day');
    expect(s.isVip).toBe(true);
    expect(calls).toEqual([600]); // débit effectif
    const delta = Date.parse(s.expiresAt!) - before;
    expect(delta).toBeGreaterThan(23 * 3600_000);
    expect(delta).toBeLessThan(25 * 3600_000);
    expect(svc.isVipCached()).toBe(true);
  });

  it('achat 30 jours → expiration ~30j + débit 30000', async () => {
    const { spend, calls } = makeSpend();
    const s = await new VipService(localApi, spend).purchase('days30');
    expect(calls).toEqual([30_000]);
    const days = (Date.parse(s.expiresAt!) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.5);
    expect(days).toBeLessThan(30.5);
  });

  it('un achat pendant une période active PROLONGE (cumule) et débite deux fois', async () => {
    const { spend, calls } = makeSpend();
    const svc = new VipService(localApi, spend);
    await svc.purchase('day');           // +1 j, débit 600
    const s = await svc.purchase('days10'); // +10 j, débit 4500
    expect(calls).toEqual([600, 4500]);
    const days = (Date.parse(s.expiresAt!) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(10.5); // ~11 jours cumulés
  });

  it('deux achats de 1 jour successifs donnent bien 2 jours', async () => {
    const { spend } = makeSpend();
    const svc = new VipService(localApi, spend);
    await svc.purchase('day');
    const s = await svc.purchase('day');
    const days = (Date.parse(s.expiresAt!) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(1.5);
    expect(days).toBeLessThan(2.5);
  });

  it('sans callback de débit local, l\'achat échoue proprement', async () => {
    await expect(new VipService(localApi).purchase('day')).rejects.toThrow();
  });

  it('solde insuffisant : purchase remonte l\'erreur et ne prolonge pas', async () => {
    const spend: SpendTokens = async () => { throw new Error('Solde insuffisant'); };
    const svc = new VipService(localApi, spend);
    await expect(svc.purchase('day')).rejects.toThrow('Solde insuffisant');
    expect(svc.isVipCached()).toBe(false);
  });

  it('une expiration passée n’est plus VIP', async () => {
    localStorage.setItem('kydos.vip.expiresAt', new Date(Date.now() - 1000).toISOString());
    const s = await new VipService(localApi).status();
    expect(s.isVip).toBe(false);
  });

  it('plan inconnu → erreur', async () => {
    await expect(new VipService(localApi).purchase('xxx' as 'day')).rejects.toThrow();
  });
});

describe('VipService — serveur-premier', () => {
  it('lit le statut serveur quand authentifié', async () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const api: VipApi = { isAuthenticated: () => true, getVipStatus: async () => ({ expiresAt: future }) };
    const s = await new VipService(api).status();
    expect(s.source).toBe('server');
    expect(s.isVip).toBe(true);
  });

  it('retombe en local si le serveur échoue', async () => {
    const api: VipApi = { isAuthenticated: () => true, getVipStatus: async () => { throw new Error('net'); } };
    const s = await new VipService(api).status();
    expect(s.source).toBe('local');
  });
});

