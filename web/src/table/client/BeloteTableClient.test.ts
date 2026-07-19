import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Faux socket.io : on capture les handlers (`on`) et les émissions (`emit`),
 * et on peut déclencher des évènements serveur via `fire(...)`. Aucun réseau.
 */
const handlers: Record<string, ((payload?: any) => void)[]> = {};
const emitted: Array<{ event: string; payload: any }> = [];
const fakeSocket = {
  on: (event: string, cb: (payload?: any) => void) => { (handlers[event] ??= []).push(cb); },
  emit: (event: string, payload?: any) => { emitted.push({ event, payload }); },
  disconnect: vi.fn(),
};
const fire = (event: string, payload?: any) => (handlers[event] ?? []).forEach((cb) => cb(payload));

vi.mock('socket.io-client', () => ({ io: () => fakeSocket }));

// Importé APRÈS le mock pour que le client utilise le faux socket.
import { BeloteTableClient } from './BeloteTableClient';

beforeEach(() => {
  for (const k of Object.keys(handlers)) delete handlers[k];
  emitted.length = 0;
  fakeSocket.disconnect.mockClear();
});

describe('BeloteTableClient — contrôleur indépendant (socket mocké)', () => {
  it('connect() passe en connecting puis connected, et rejoint la table fournie', () => {
    const client = new BeloteTableClient({ socketUrl: 'x', token: 't', tableId: 'tbl_1' });
    client.connect();
    expect(client.getContext().status).toBe('connecting');
    fire('connect');
    expect(client.getContext().status).toBe('connected');
    expect(emitted).toContainEqual({ event: 'table:subscribe', payload: 'tbl_1' });
  });

  it('met à jour le contexte sur table:update / table:game / table:finished', () => {
    const client = new BeloteTableClient({ socketUrl: 'x', tableId: 'tbl_1' });
    client.connect(); fire('connect');
    fire('table:update', { id: 'tbl_1', seats: [] });
    expect(client.getContext().table?.id).toBe('tbl_1');
    fire('table:game', { view: { phase: 'bidding' }, summary: {} });
    expect(client.getContext().state?.view.phase).toBe('bidding');
    fire('table:finished', { winner: 'A' });
    expect(client.getContext().finished?.winner).toBe('A');
  });

  it('le flux d’évènements (on) notifie et se désabonne proprement', () => {
    const client = new BeloteTableClient({ socketUrl: 'x' });
    const seen: string[] = [];
    const off = client.on((e) => seen.push(e.type));
    client.connect(); fire('connect');
    fire('tables:changed');
    off();
    fire('table:finished', { winner: 'B' });
    expect(seen).toContain('status');
    expect(seen).toContain('tablesChanged');
    expect(seen).not.toContain('finished'); // désabonné avant
  });

  it('bid() / play() émettent les bonnes actions avec le tableId courant', () => {
    const client = new BeloteTableClient({ socketUrl: 'x', tableId: 'tbl_9' });
    client.connect(); fire('connect');
    client.bid({ action: 'bid', value: 110, suit: 'pique', saidSuit: true });
    client.play({ rank: 'A', suit: 'coeur' } as any);
    expect(emitted).toContainEqual({ event: 'table:bid', payload: { tableId: 'tbl_9', bid: { action: 'bid', value: 110, suit: 'pique', saidSuit: true } } });
    expect(emitted).toContainEqual({ event: 'table:play', payload: { tableId: 'tbl_9', card: { rank: 'A', suit: 'coeur' } } });
  });

  it('getLogs() conserve le journal borné des évènements', () => {
    const client = new BeloteTableClient({ socketUrl: 'x', logLimit: 5 });
    client.connect(); fire('connect');
    for (let i = 0; i < 20; i++) fire('tables:changed');
    expect(client.getLogs().length).toBeLessThanOrEqual(5);
  });

  it('disconnect() ferme le socket et réinitialise le contexte', () => {
    const client = new BeloteTableClient({ socketUrl: 'x', tableId: 'tbl_1' });
    client.connect(); fire('connect');
    client.disconnect();
    expect(fakeSocket.disconnect).toHaveBeenCalled();
    expect(client.getContext().tableId).toBeNull();
  });
});
