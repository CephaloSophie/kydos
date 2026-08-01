import { describe, expect, it } from 'vitest';
import { digitsOnly, formatPromoCode, isCompleteCode } from './promoCode';

describe('promoCode — normalisation', () => {
  it('ne garde que les chiffres, plafonné à 12', () => {
    expect(digitsOnly('1234-5678-9012')).toBe('123456789012');
    expect(digitsOnly('12 34 56')).toBe('123456');
    expect(digitsOnly('abc123def456')).toBe('123456');
    expect(digitsOnly('1234567890123456')).toBe('123456789012'); // tronqué à 12
  });
});

describe('promoCode — formatage (tiret tous les 4 chiffres)', () => {
  it('insère un tiret tous les 4 chiffres', () => {
    expect(formatPromoCode('123456789012')).toBe('1234-5678-9012');
    expect(formatPromoCode('12345678')).toBe('1234-5678');
    expect(formatPromoCode('1234')).toBe('1234');
    expect(formatPromoCode('12')).toBe('12');
    expect(formatPromoCode('')).toBe('');
  });

  it('ignore les caractères non numériques déjà présents', () => {
    expect(formatPromoCode('1234-5678')).toBe('1234-5678');
    expect(formatPromoCode('abcd1234efgh5678')).toBe('1234-5678');
  });
});

describe('promoCode — complétude', () => {
  it('vrai seulement à 12 chiffres', () => {
    expect(isCompleteCode('1234-5678-9012')).toBe(true);
    expect(isCompleteCode('123456789012')).toBe(true);
    expect(isCompleteCode('1234-5678-901')).toBe(false);
    expect(isCompleteCode('')).toBe(false);
  });
});
