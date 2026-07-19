/**
 * scoreSheetModel — pure helpers behind the notebook score sheet.
 *
 * The sheet mimics how Contrée scores are kept on paper:
 * - after every donne, each team that scored writes its NEW CUMULATIVE total;
 * - values are written in TENS (the final digit is always 0): 500 → "50";
 * - when a team crosses a thousand, a slanted bar is drawn once in its column
 *   (two bars for 2000, three for 3000…) and the following totals drop the
 *   thousands digit: 1010 → "01", 1330 → "33".
 */

export interface CumulPoint { A: number; B: number }

export interface SheetCell {
  /** Text to write ("02", "96", "01"…), or null when the team didn't score. */
  text: string | null;
  /** Number of NEW thousand bars to draw ABOVE this cell (0 = none). */
  bars: number;
}

export interface SheetLine { a: SheetCell; b: SheetCell }

/** Formats one cumulative total the paper way: tens only, thousands dropped. */
export function formatCumul(value: number): string {
  const tens = Math.floor((value % 1000) / 10);
  return String(tens).padStart(2, '0');
}

/** Thousands crossed so far for a value (1010 → 1, 2040 → 2). */
export function thousandsOf(value: number): number {
  return Math.floor(value / 1000);
}

/**
 * Builds the sheet lines from the successive cumulative totals of the current
 * manche. `history` holds every distinct {A,B} snapshot, in order, starting
 * implicitly from {0,0} (do NOT include the initial zero point).
 */
export function buildSheetLines(history: CumulPoint[]): SheetLine[] {
  const lines: SheetLine[] = [];
  let prev: CumulPoint = { A: 0, B: 0 };
  for (const point of history) {
    const aScored = point.A !== prev.A;
    const bScored = point.B !== prev.B;
    if (!aScored && !bScored) continue;
    lines.push({
      a: aScored
        ? { text: formatCumul(point.A), bars: Math.max(0, thousandsOf(point.A) - thousandsOf(prev.A)) }
        : { text: null, bars: 0 },
      b: bScored
        ? { text: formatCumul(point.B), bars: Math.max(0, thousandsOf(point.B) - thousandsOf(prev.B)) }
        : { text: null, bars: 0 },
    });
    prev = point;
  }
  return lines;
}
