// Pure-logic tests for promo code normalization/format (no DB).
import { describe, expect, it } from 'vitest';
import { normalizeCode, isValidFormat } from './promo.service.js';

describe('promo — normalisation & format', () => {
  it('retire tirets, espaces et lettres', () => {
    expect(normalizeCode('1234-5678-9012')).toBe('123456789012');
    expect(normalizeCode('1234 5678 9012')).toBe('123456789012');
    expect(normalizeCode('AB12CD34')).toBe('1234');
    expect(normalizeCode('')).toBe('');
  });

  it('valide exactement 12 chiffres', () => {
    expect(isValidFormat('123456789012')).toBe(true);
    expect(isValidFormat('12345678901')).toBe(false);  // 11
    expect(isValidFormat('1234567890123')).toBe(false); // 13
    expect(isValidFormat('12345678901a')).toBe(false);
    expect(isValidFormat('')).toBe(false);
  });
});
