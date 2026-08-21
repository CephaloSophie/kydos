/* =============================================================================
 * MATCHMAKING · tests/matchmaking.autoRejoin.test.ts
 * -----------------------------------------------------------------------------
 * Test unitaire du helper `readAutoRejoinSecFromCfg` utilisé par
 * `matchmakingController.mine` pour exposer le délai (s) du chrono de
 * redirection auto de la popup LIVE. Fonction pure, aucun Mongoose.
 * ========================================================================== */
import { describe, it, expect } from 'vitest';
import { readAutoRejoinSecFromCfg } from './matchmaking.controller.js';

describe('readAutoRejoinSecFromCfg', () => {
  it('lit la valeur numérique du MatchFormatConfig', () => {
    expect(readAutoRejoinSecFromCfg({ autoRejoinSec: 3 })).toBe(3);
    expect(readAutoRejoinSecFromCfg({ autoRejoinSec: 0 })).toBe(0);
    expect(readAutoRejoinSecFromCfg({ autoRejoinSec: 12 })).toBe(12);
  });

  it('défaut 5 s quand la valeur est absente / null / non-finie', () => {
    expect(readAutoRejoinSecFromCfg(null)).toBe(5);
    expect(readAutoRejoinSecFromCfg(undefined)).toBe(5);
    expect(readAutoRejoinSecFromCfg({})).toBe(5);
    expect(readAutoRejoinSecFromCfg({ autoRejoinSec: 'abc' })).toBe(5);
    expect(readAutoRejoinSecFromCfg({ autoRejoinSec: NaN })).toBe(5);
    expect(readAutoRejoinSecFromCfg({ autoRejoinSec: undefined })).toBe(5);
  });
});
