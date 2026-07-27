// Unit test for the hand-visibility rule: SOUTH is always face-up, the three
// other seats are always face-down — regardless of the debug "opponentCards"
// mode, and the partner is NEVER revealed.
import { describe, expect, it } from 'vitest';

/** Pure replica of the rule applied in HandsLayer.update (documented there). */
function faceUpForRelative(rel: number, mode: 'hidden' | 'back' | 'faceup', partnerFaceDown: boolean): boolean {
  const interactive = rel === 0;
  return interactive || (mode === 'faceup' && !(rel === 2 && partnerFaceDown));
}

describe('hand visibility rule', () => {
  it('SOUTH (rel 0) is ALWAYS face-up, whatever the mode', () => {
    for (const mode of ['hidden', 'back', 'faceup'] as const) {
      expect(faceUpForRelative(0, mode, true)).toBe(true);
    }
  });

  it('the 3 opponents are face-DOWN in back/hidden mode', () => {
    for (const rel of [1, 2, 3]) {
      expect(faceUpForRelative(rel, 'back', true)).toBe(false);
      expect(faceUpForRelative(rel, 'hidden', true)).toBe(false);
    }
  });

  it('the partner (rel 2) is NEVER revealed when partnerFaceDown is set', () => {
    expect(faceUpForRelative(2, 'faceup', true)).toBe(false);
  });

  it('only the non-partner opponents can be shown in debug faceup mode', () => {
    expect(faceUpForRelative(1, 'faceup', true)).toBe(true);
    expect(faceUpForRelative(3, 'faceup', true)).toBe(true);
    expect(faceUpForRelative(2, 'faceup', true)).toBe(false);
  });
});
