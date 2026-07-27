// Unit tests — team client-side permissions (mirror of the server).
// The mobile UI relies on these helpers to hide inaccessible actions.
import { describe, expect, it } from 'vitest';
import {
  authority, canAct, canAssign, canChangeVisibility, canInvite, canRenameTeam,
  ROLE_ACCENTS, ROLE_LABELS, TEAM_MAX_MEMBERS, TEAM_ROLES,
} from './Team';

describe('authority ordering', () => {
  it('mirrors the server (owner > super > admin > user)', () => {
    expect(authority('owner')).toBeGreaterThan(authority('super'));
    expect(authority('super')).toBeGreaterThan(authority('admin'));
    expect(authority('admin')).toBeGreaterThan(authority('user'));
  });
});

describe('canAct', () => {
  it('owner acts on anyone lower, but never on another owner', () => {
    expect(canAct('owner', 'super')).toBe(true);
    expect(canAct('owner', 'user')).toBe(true);
    expect(canAct('owner', 'owner')).toBe(false);
  });

  it('user cannot act on anyone', () => {
    for (const r of TEAM_ROLES) expect(canAct('user', r)).toBe(false);
  });
});

describe('canAssign', () => {
  it('owner role is protected (never assignable)', () => {
    for (const actor of TEAM_ROLES) expect(canAssign(actor, 'owner')).toBe(false);
  });

  it('super cannot promote to super', () => {
    expect(canAssign('super', 'super')).toBe(false);
    expect(canAssign('super', 'admin')).toBe(true);
    expect(canAssign('super', 'user')).toBe(true);
  });

  it('admin can only assign user', () => {
    expect(canAssign('admin', 'user')).toBe(true);
    expect(canAssign('admin', 'admin')).toBe(false);
    expect(canAssign('admin', 'super')).toBe(false);
  });
});

describe('canRenameTeam / canChangeVisibility / canInvite', () => {
  it('rename: owner + super', () => {
    expect(canRenameTeam('owner')).toBe(true);
    expect(canRenameTeam('super')).toBe(true);
    expect(canRenameTeam('admin')).toBe(false);
    expect(canRenameTeam('user')).toBe(false);
  });

  it('visibility: owner only', () => {
    expect(canChangeVisibility('owner')).toBe(true);
    for (const r of ['super', 'admin', 'user'] as const) expect(canChangeVisibility(r)).toBe(false);
  });

  it('invite: everyone except user', () => {
    expect(canInvite('user')).toBe(false);
    for (const r of ['owner', 'super', 'admin'] as const) expect(canInvite(r)).toBe(true);
  });
});

describe('constants', () => {
  it('max members = 40 (SPEC §3.5)', () => {
    expect(TEAM_MAX_MEMBERS).toBe(40);
  });

  it('every role has a label and an accent color', () => {
    for (const r of TEAM_ROLES) {
      expect(ROLE_LABELS[r]).toBeTruthy();
      expect(ROLE_ACCENTS[r]).toBeTruthy();
    }
  });
});
