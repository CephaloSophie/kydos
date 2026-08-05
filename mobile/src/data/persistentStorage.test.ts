// @vitest-environment happy-dom
// Tests for persistentStorage — versioned envelope, TTL, namespace clearing.
import { describe, it, expect, beforeEach } from 'vitest';
import { persistGet, persistSet, persistRemove, persistClearAll, persistAge } from './persistentStorage';

beforeEach(() => localStorage.clear());

describe('persistentStorage', () => {
  it('round-trips a value', () => {
    persistSet('k', { a: 1, b: 'x' });
    expect(persistGet<{ a: number; b: string }>('k')).toEqual({ a: 1, b: 'x' });
  });

  it('returns null for a missing key', () => {
    expect(persistGet('nope')).toBeNull();
  });

  it('honours maxAgeMs (fresh vs stale)', () => {
    persistSet('k', 42);
    expect(persistGet<number>('k', 10_000)).toBe(42); // fresh
    expect(persistGet<number>('k', -1)).toBeNull();    // forced stale
  });

  it('exposes the write timestamp via persistAge', () => {
    const before = Date.now();
    persistSet('k', 1);
    const at = persistAge('k');
    expect(at).not.toBeNull();
    expect(at!).toBeGreaterThanOrEqual(before);
  });

  it('remove deletes a single entry', () => {
    persistSet('k', 1);
    persistRemove('k');
    expect(persistGet('k')).toBeNull();
  });

  it('clearAll removes only namespaced cache entries, not other keys', () => {
    persistSet('a', 1);
    persistSet('b', 2);
    localStorage.setItem('kydos.mobile.token', 'keepme'); // hors namespace cache
    persistClearAll();
    expect(persistGet('a')).toBeNull();
    expect(persistGet('b')).toBeNull();
    expect(localStorage.getItem('kydos.mobile.token')).toBe('keepme');
  });

  it('ignores a corrupted entry gracefully', () => {
    // Écrit une valeur brute non conforme à l'enveloppe attendue.
    localStorage.setItem('kydos.cache.broken', '{not valid json');
    expect(persistGet('broken')).toBeNull();
  });
});
