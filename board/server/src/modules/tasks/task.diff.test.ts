// Unit tests for the pure diff logic used by the archive mechanism.
// We don't need a real Mongo connection here — we exercise the shape.
import { describe, it, expect } from 'vitest';

/** Local copy of the diff helper (kept in sync with task.service.ts). */
function computeDiff<T extends Record<string, unknown>>(before: T, after: Partial<T>, fields: readonly string[]) {
  const diffs: { field: string; before: unknown; after: unknown }[] = [];
  for (const field of fields) {
    if (!(field in after)) continue;
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      diffs.push({ field, before: before[field], after: after[field] });
    }
  }
  return diffs;
}

const FIELDS = ['title', 'status', 'priority', 'description'] as const;

describe('task.diff — computeDiff', () => {
  it('returns [] when no field changed', () => {
    const t = { title: 'A', status: 'pending', priority: 'P2', description: 'x' };
    expect(computeDiff(t, { title: 'A' }, FIELDS)).toEqual([]);
    expect(computeDiff(t, { description: 'x' }, FIELDS)).toEqual([]);
  });

  it('detects single field change with before/after', () => {
    const t = { title: 'A', status: 'pending', priority: 'P2', description: 'x' };
    const diffs = computeDiff(t, { status: 'tested' }, FIELDS);
    expect(diffs).toEqual([{ field: 'status', before: 'pending', after: 'tested' }]);
  });

  it('detects multiple field changes at once', () => {
    const t = { title: 'A', status: 'pending', priority: 'P2', description: 'x' };
    const diffs = computeDiff(t, { title: 'B', status: 'tested' }, FIELDS);
    expect(diffs).toHaveLength(2);
    expect(diffs.map((d) => d.field).sort()).toEqual(['status', 'title']);
  });

  it('deep-compares arrays and objects via JSON serialization', () => {
    const before = { instructions: ['a', 'b'], acceptance: [] };
    const after1 = { instructions: ['a', 'b'] };            // same array
    const after2 = { instructions: ['a', 'b', 'c'] };       // changed
    expect(computeDiff(before, after1, ['instructions', 'acceptance'])).toEqual([]);
    expect(computeDiff(before, after2, ['instructions', 'acceptance'])).toHaveLength(1);
  });

  it('ignores fields NOT present in the patch (no false positives)', () => {
    const t = { title: 'A', status: 'pending', priority: 'P2', description: 'x' };
    // Patch does not include `title`; even if before.title !== 'anything', no diff must be reported.
    expect(computeDiff(t, { status: 'pending' }, FIELDS)).toEqual([]);
  });
});
