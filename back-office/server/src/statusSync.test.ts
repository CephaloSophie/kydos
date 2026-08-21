import { describe, it, expect } from 'vitest';
import { isLifecycleStatus, resolveStatus } from './statusSync.js';

describe('isLifecycleStatus', () => {
  it('reconnaît les 3 statuts, rejette le reste', () => {
    expect(isLifecycleStatus('draft')).toBe(true);
    expect(isLifecycleStatus('pending')).toBe(true);
    expect(isLifecycleStatus('active')).toBe(true);
    expect(isLifecycleStatus('published')).toBe(false);
    expect(isLifecycleStatus(null)).toBe(false);
  });
});

describe('resolveStatus', () => {
  it('status fourni fait foi ; active en découle', () => {
    expect(resolveStatus({ status: 'draft' })).toEqual({ status: 'draft', active: false });
    expect(resolveStatus({ status: 'pending' })).toEqual({ status: 'pending', active: false });
    expect(resolveStatus({ status: 'active' })).toEqual({ status: 'active', active: true });
  });

  it('active booléen legacy → status déduit', () => {
    expect(resolveStatus({ active: true })).toEqual({ status: 'active', active: true });
    expect(resolveStatus({ active: false })).toEqual({ status: 'draft', active: false });
  });

  it('status prioritaire sur active si les deux sont fournis', () => {
    expect(resolveStatus({ status: 'pending', active: true })).toEqual({ status: 'pending', active: false });
  });

  it('rien fourni → conserve l\'état courant', () => {
    expect(resolveStatus({}, { status: 'pending', active: false })).toEqual({ status: 'pending', active: false });
    expect(resolveStatus({}, {})).toEqual({ status: 'active', active: true });
  });
});
