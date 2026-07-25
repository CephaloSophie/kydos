// Unit tests for team permissions (pure logic, no I/O).
import { describe, expect, it } from 'vitest';
import { canAct, canAssign, canInvite, canRenameTeam, authority, ROLES_BY_AUTHORITY } from './permissions.js';

describe('authority', () => {
  it('orders roles owner > super > admin > user', () => {
    expect(authority('owner')).toBeGreaterThan(authority('super'));
    expect(authority('super')).toBeGreaterThan(authority('admin'));
    expect(authority('admin')).toBeGreaterThan(authority('user'));
  });
});

describe('canAct (act on someone: kick / change role)', () => {
  it('owner can act on super, admin, user — but NOT on itself as owner', () => {
    expect(canAct('owner', 'super')).toBe(true);
    expect(canAct('owner', 'admin')).toBe(true);
    expect(canAct('owner', 'user')).toBe(true);
    expect(canAct('owner', 'owner')).toBe(false);
  });

  it('super acts on admin and user but not on super or owner', () => {
    expect(canAct('super', 'admin')).toBe(true);
    expect(canAct('super', 'user')).toBe(true);
    expect(canAct('super', 'super')).toBe(false);
    expect(canAct('super', 'owner')).toBe(false);
  });

  it('admin acts on user only', () => {
    expect(canAct('admin', 'user')).toBe(true);
    expect(canAct('admin', 'admin')).toBe(false);
    expect(canAct('admin', 'super')).toBe(false);
    expect(canAct('admin', 'owner')).toBe(false);
  });

  it('user cannot act on anyone', () => {
    expect(canAct('user', 'user')).toBe(false);
    expect(canAct('user', 'admin')).toBe(false);
    expect(canAct('user', 'super')).toBe(false);
    expect(canAct('user', 'owner')).toBe(false);
  });
});

describe('canAssign (award a role)', () => {
  it('nobody can assign the owner role (protected — needs transfer flow)', () => {
    expect(canAssign('owner', 'owner')).toBe(false);
    expect(canAssign('super', 'owner')).toBe(false);
  });

  it('owner can assign super/admin/user', () => {
    expect(canAssign('owner', 'super')).toBe(true);
    expect(canAssign('owner', 'admin')).toBe(true);
    expect(canAssign('owner', 'user')).toBe(true);
  });

  it('super can assign admin and user but not another super', () => {
    expect(canAssign('super', 'admin')).toBe(true);
    expect(canAssign('super', 'user')).toBe(true);
    expect(canAssign('super', 'super')).toBe(false);
  });

  it('admin can assign user only', () => {
    expect(canAssign('admin', 'user')).toBe(true);
    expect(canAssign('admin', 'admin')).toBe(false);
    expect(canAssign('admin', 'super')).toBe(false);
  });

  it('user cannot assign anything', () => {
    for (const r of ['user', 'admin', 'super', 'owner'] as const) expect(canAssign('user', r)).toBe(false);
  });
});

describe('canRenameTeam', () => {
  it('owner and super can rename; admin/user cannot', () => {
    expect(canRenameTeam('owner')).toBe(true);
    expect(canRenameTeam('super')).toBe(true);
    expect(canRenameTeam('admin')).toBe(false);
    expect(canRenameTeam('user')).toBe(false);
  });
});

describe('canInvite', () => {
  it('everybody except user can invite', () => {
    expect(canInvite('owner')).toBe(true);
    expect(canInvite('super')).toBe(true);
    expect(canInvite('admin')).toBe(true);
    expect(canInvite('user')).toBe(false);
  });
});

describe('ROLES_BY_AUTHORITY', () => {
  it('lists roles top-down for UI display', () => {
    expect(ROLES_BY_AUTHORITY).toEqual(['owner', 'super', 'admin', 'user']);
  });
});
