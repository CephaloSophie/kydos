// Unit tests for the notebook score sheet math (Ameur's paper-scoring rules).
import { describe, expect, it } from 'vitest';
import { buildSheetLines, formatCumul, thousandsOf } from './scoreSheetModel';

describe('formatCumul', () => {
  it('writes the total in tens, two digits (the final 0 is dropped)', () => {
    expect(formatCumul(20)).toBe('02');
    expect(formatCumul(40)).toBe('04');
    expect(formatCumul(500)).toBe('50');
    expect(formatCumul(960)).toBe('96');
  });

  it('drops the thousands digit once past 1000 (1010 → "01", 1330 → "33")', () => {
    expect(formatCumul(1010)).toBe('01');
    expect(formatCumul(1330)).toBe('33');
    expect(formatCumul(2040)).toBe('04');
  });
});

describe('thousandsOf', () => {
  it('counts crossed thousands', () => {
    expect(thousandsOf(960)).toBe(0);
    expect(thousandsOf(1010)).toBe(1);
    expect(thousandsOf(2040)).toBe(2);
    expect(thousandsOf(3000)).toBe(3);
  });
});

describe('buildSheetLines', () => {
  it("reproduces Ameur's reference sheet exactly", () => {
    // A: 20,40,200,700,740,900,960, |1010|,1330 — B: 140,280,—,—,400,—,500,610,—
    const history = [
      { A: 20, B: 140 },
      { A: 40, B: 280 },
      { A: 200, B: 280 },
      { A: 700, B: 280 },
      { A: 740, B: 400 },
      { A: 900, B: 400 },
      { A: 960, B: 500 },
      { A: 1010, B: 610 },
      { A: 1330, B: 610 },
    ];
    const lines = buildSheetLines(history);
    expect(lines.map((l) => [l.a.text, l.b.text])).toEqual([
      ['02', '14'],
      ['04', '28'],
      ['20', null],
      ['70', null],
      ['74', '40'],
      ['90', null],
      ['96', '50'],
      ['01', '61'],
      ['33', null],
    ]);
    // ONE slanted bar in column A on the line that crosses 1000, nowhere else.
    expect(lines.map((l) => l.a.bars)).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 0]);
    expect(lines.map((l) => l.b.bars)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('draws TWO bars when a single donne crosses two thousands', () => {
    const lines = buildSheetLines([{ A: 900, B: 0 }, { A: 2100, B: 0 }]);
    expect(lines[1].a.bars).toBe(2);
    expect(lines[1].a.text).toBe('10'); // 2100 → 100 → "10"
  });

  it('skips lines where neither team scored', () => {
    const lines = buildSheetLines([{ A: 100, B: 0 }, { A: 100, B: 0 }, { A: 100, B: 160 }]);
    expect(lines).toHaveLength(2);
    expect(lines[1].a.text).toBe(null);
    expect(lines[1].b.text).toBe('16');
  });
});
