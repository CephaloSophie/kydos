// Unit tests for the in-memory log ring buffer used by the wslogs monitor.
import { describe, expect, it } from 'vitest';
import { createLogger, recentLogs, subscribeLogs } from './logger.js';

describe('logger ring buffer', () => {
  it('records emitted logs and exposes them via recentLogs', () => {
    const log = createLogger('test-scope');
    log.info('hello monitor', { a: 1 });
    const recent = recentLogs(50);
    const found = recent.find((r) => r.scope === 'test-scope' && r.message === 'hello monitor');
    expect(found).toBeTruthy();
    expect(found?.level).toBe('info');
    expect(found?.data).toEqual({ a: 1 });
  });

  it('notifies subscribers of new logs', () => {
    const received: string[] = [];
    const unsubscribe = subscribeLogs((r) => received.push(r.message));
    const log = createLogger('sub-test');
    log.warn('a warning');
    unsubscribe();
    log.warn('after unsubscribe');
    expect(received).toContain('a warning');
    expect(received).not.toContain('after unsubscribe');
  });
});
