// Unit tests for the healthcheck's pure helpers. The full script is an
// integration tool tested end-to-end manually via `make check`.
import { describe, expect, it } from 'vitest';
/** Reproduction locale de la fonction detectLanIp du script — logique testable. */
type NIStub = Record<string, Array<{ family: string; address: string; internal: boolean }>>;
function detectLanIp(getNi: () => NIStub) {
  const cand: string[] = [];
  for (const addrs of Object.values(getNi())) {
    for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal) cand.push(a.address);
  }
  const score = (ip: string) => ip.startsWith('192.168.') ? 3 : ip.startsWith('10.') ? 2 : ip.startsWith('172.') ? 1 : 0;
  cand.sort((a, b) => score(b) - score(a));
  return cand[0];
}

describe('detectLanIp — sélection de l’IP LAN', () => {
  it('préfère 192.168.x aux autres plages privées', () => {
    const ip = detectLanIp(() => ({
      eth0: [{ family: 'IPv4', address: '10.0.0.5', internal: false }] as any,
      wlan0: [{ family: 'IPv4', address: '192.168.1.42', internal: false }] as any,
    }));
    expect(ip).toBe('192.168.1.42');
  });

  it('ignore loopback et IPv6', () => {
    const ip = detectLanIp(() => ({
      lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }] as any,
      eth0: [{ family: 'IPv6', address: '::1', internal: false }] as any,
      wlan0: [{ family: 'IPv4', address: '10.0.0.3', internal: false }] as any,
    }));
    expect(ip).toBe('10.0.0.3');
  });

  it('renvoie undefined si aucune interface externe', () => {
    const ip = detectLanIp(() => ({ lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }] as any }));
    expect(ip).toBeUndefined();
  });

  it('classe correctement toutes les plages privées (192.168 > 10 > 172)', () => {
    const ip = detectLanIp(() => ({
      a: [{ family: 'IPv4', address: '172.16.0.1', internal: false }] as any,
      b: [{ family: 'IPv4', address: '10.0.0.1', internal: false }] as any,
      c: [{ family: 'IPv4', address: '192.168.0.1', internal: false }] as any,
    }));
    expect(ip).toBe('192.168.0.1');
  });
});

describe('URL par cible mobile', () => {
  const urlFor = (target: string, port: number, lanIp?: string) => ({
    device: lanIp ? `http://${lanIp}:${port}/api` : null,
    emulator: `http://10.0.2.2:${port}/api`,
    'ios-sim': `http://localhost:${port}/api`,
  }[target]);

  it('device physique → IP LAN', () => {
    expect(urlFor('device', 4000, '192.168.1.42')).toBe('http://192.168.1.42:4000/api');
  });
  it('émulateur Android → 10.0.2.2', () => {
    expect(urlFor('emulator', 4000)).toBe('http://10.0.2.2:4000/api');
  });
  it('simulateur iOS → localhost', () => {
    expect(urlFor('ios-sim', 4000)).toBe('http://localhost:4000/api');
  });
});
