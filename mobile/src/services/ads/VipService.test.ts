// @vitest-environment happy-dom
// Tests for VipService: purchase durations, extension, VIP eligibility.
import { beforeEach, describe, expect, it } from 'vitest';
import { VipService, VIP_PLANS, type VipApi } from './VipService';

const localApi: VipApi = { isAuthenticated: () => false };

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

describe('VipService — statut', () => {
  it('non-VIP par défaut', async () => {
    const s = await new VipService(localApi).status();
    expect(s.isVip).toBe(false);
    expect(s.expiresAt).toBeNull();
  });

  it('achat 1 jour → VIP actif, expiration ~24h plus tard', async () => {
    const svc = new VipService(localApi);
    const before = Date.now();
    const s = await svc.purchase('day');
    expect(s.isVip).toBe(true);
    const delta = Date.parse(s.expiresAt!) - before;
    expect(delta).toBeGreaterThan(23 * 3600_000);
    expect(delta).toBeLessThan(25 * 3600_000);
    expect(svc.isVipCached()).toBe(true);
  });

  it('achat 30 jours → expiration ~30j plus tard', async () => {
    const svc = new VipService(localApi);
    const s = await svc.purchase('days30');
    const days = (Date.parse(s.expiresAt!) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.5);
    expect(days).toBeLessThan(30.5);
  });

  it('un achat pendant une période active PROLONGE (cumule) au lieu de remplacer', async () => {
    const svc = new VipService(localApi);
    await svc.purchase('day');           // +1 j
    const s = await svc.purchase('days10'); // +10 j depuis l'expiration
    const days = (Date.parse(s.expiresAt!) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(10.5); // ~11 jours cumulés
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
