// @vitest-environment happy-dom
// Tests for AdManager orchestration with a fake provider (VIP gating,
// frequency cap, rewarded logic, App Open navigation timer).
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AdManager } from './AdManager';
import { VipService, type VipApi } from './VipService';
import { EventBus } from '../../core/EventBus';
import type { AdProvider, RewardResult, ShowResult } from './types';

// --- Rendre isNativePlatform() vrai pour tester la logique « native ». -------
vi.mock('./platform', () => ({
  isNativePlatform: () => true,
  getPlatform: () => 'android',
}));

class FakeProvider implements AdProvider {
  readonly network = 'admob' as const;
  calls: string[] = [];
  rewardResult: RewardResult = { rewarded: true, amount: 0 };
  interstitialResult: ShowResult = { shown: true };
  appOpenResult: ShowResult = { shown: true };
  async initialize() { this.calls.push('init'); }
  async showBanner() { this.calls.push('banner'); }
  async hideBanner() { this.calls.push('hideBanner'); }
  async prepareInterstitial() {}
  async showInterstitial() { this.calls.push('interstitial'); return this.interstitialResult; }
  async prepareRewarded() {}
  async showRewarded() { this.calls.push('rewarded'); return this.rewardResult; }
  async prepareAppOpen() {}
  async showAppOpen() { this.calls.push('appOpen'); return this.appOpenResult; }
}

const notVip: VipApi = { isAuthenticated: () => false };

function make(overrides: Partial<{ vip: VipService; claimed: boolean }> = {}) {
  const bus = new EventBus();
  const provider = new FakeProvider();
  const credited: number[] = [];
  const mgr = new AdManager({
    bus,
    vip: overrides.vip ?? new VipService(notVip),
    onReward: (n) => { credited.push(n); },
    hasClaimedDaily: () => overrides.claimed ?? false,
    provider,
  });
  return { bus, provider, mgr, credited };
}

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('AdManager — bannière', () => {
  it('affiche puis masque la bannière (non-VIP)', async () => {
    const { mgr, provider } = make();
    await mgr.showBanner();
    expect(provider.calls).toContain('banner');
    await mgr.hideBanner();
    expect(provider.calls).toContain('hideBanner');
  });

  it('un VIP ne voit pas la bannière', async () => {
    const vip = new VipService({ isAuthenticated: () => false }, async () => ({ balance: 100000 }));
    await vip.purchase('day');
    const { mgr, provider } = make({ vip });
    await mgr.showBanner();
    expect(provider.calls).not.toContain('banner');
  });

  it('rafraîchit la bannière toutes les 60s tant qu’elle est visible', async () => {
    const { mgr, provider } = make();
    await mgr.showBanner();
    provider.calls.length = 0;              // repart du showBanner initial
    vi.advanceTimersByTime(60_000);
    await Promise.resolve(); await Promise.resolve();
    // un cycle = hideBanner puis showBanner
    expect(provider.calls).toContain('hideBanner');
    expect(provider.calls).toContain('banner');
    await mgr.hideBanner();
    provider.calls.length = 0;
    vi.advanceTimersByTime(120_000);        // plus de refresh après masquage
    await Promise.resolve();
    expect(provider.calls).not.toContain('banner');
  });
});

describe('AdManager — interstitiels & anti-spam', () => {
  it('après-partie affiche un interstitiel', async () => {
    const { mgr, provider } = make();
    const r = await mgr.afterGame();
    expect(r.shown).toBe(true);
    expect(provider.calls).toContain('interstitial');
  });

  it('deux interstitiels rapprochés : le second est bloqué (frequency cap)', async () => {
    const { mgr } = make();
    await mgr.afterGame();
    const second = await mgr.beforeCreateTable();
    expect(second.shown).toBe(false);
    expect(second.reason).toBe('frequency-capped');
  });

  it('un VIP ne voit aucun interstitiel', async () => {
    const vip = new VipService({ isAuthenticated: () => false }, async () => ({ balance: 100000 }));
    await vip.purchase('days10');
    const { mgr } = make({ vip });
    const r = await mgr.afterGame();
    expect(r).toEqual({ shown: false, reason: 'vip' });
  });
});

describe('AdManager — récompensées', () => {
  it('crédite le quotidien si non réclamé', async () => {
    const { mgr, credited } = make({ claimed: false });
    const r = await mgr.watchRewarded();
    expect(r.rewarded).toBe(true);
    expect(credited[0]).toBe(500); // dailyRewardTokens
  });

  it('crédite +100 par visionnage si le quotidien est déjà pris', async () => {
    const { mgr, credited } = make({ claimed: true });
    await mgr.watchRewarded();
    expect(credited[0]).toBe(100); // extraRewardTokens
  });

  it('émet ads:reward-granted', async () => {
    const { mgr, bus } = make({ claimed: true });
    const spy = vi.fn(); bus.on('ads:reward-granted', spy);
    await mgr.watchRewarded();
    expect(spy).toHaveBeenCalledWith({ amount: 100 });
  });

  it('pas de crédit si la pub n’est pas complétée', async () => {
    const { mgr, provider, credited } = make();
    provider.rewardResult = { rewarded: false, amount: 0 };
    const r = await mgr.watchRewarded();
    expect(r.rewarded).toBe(false);
    expect(credited).toHaveLength(0);
  });
});

describe('AdManager — App Open (navigation 3 min hors table)', () => {
  it('après 3 min de navigation puis retour sur un écran éligible → App Open', async () => {
    const { mgr, provider } = make();
    mgr.notifyScreen('home');        // arme la minuterie
    vi.advanceTimersByTime(3 * 60_000 + 100);
    mgr.notifyScreen('robots');      // écran éligible → doit déclencher
    await Promise.resolve();         // laisse la promesse interne se résoudre
    expect(provider.calls).toContain('appOpen');
  });

  it('la table en ligne ne déclenche jamais l’App Open', async () => {
    const { mgr, provider } = make();
    mgr.notifyScreen('home');
    vi.advanceTimersByTime(3 * 60_000 + 100);
    mgr.notifyScreen('table');       // table : jamais d'App Open
    await Promise.resolve();
    expect(provider.calls).not.toContain('appOpen');
  });

  it('avant l’entraînement affiche une App Open', async () => {
    const { mgr, provider } = make();
    const r = await mgr.beforeTraining();
    expect(r.shown).toBe(true);
    expect(provider.calls).toContain('appOpen');
  });
});
