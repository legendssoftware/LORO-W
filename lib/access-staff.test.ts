import { describe, expect, it } from 'vitest';
import { canManageApprovals, canManageStaffUsers } from './access';

describe('canManageStaffUsers', () => {
  it('allows admin, manager, owner, and HR to send intake links', () => {
    expect(canManageStaffUsers('admin')).toBe(true);
    expect(canManageStaffUsers('manager')).toBe(true);
    expect(canManageStaffUsers('owner')).toBe(true);
    expect(canManageStaffUsers('hr')).toBe(true);
    expect(canManageStaffUsers('HR')).toBe(true);
  });

  it('blocks standard users', () => {
    expect(canManageStaffUsers('user')).toBe(false);
    expect(canManageStaffUsers(undefined)).toBe(false);
  });
});

describe('canManageApprovals', () => {
  it('allows admin, manager, owner, and HR', () => {
    expect(canManageApprovals('admin')).toBe(true);
    expect(canManageApprovals('manager')).toBe(true);
    expect(canManageApprovals('owner')).toBe(true);
    expect(canManageApprovals('hr')).toBe(true);
  });

  it('blocks standard users', () => {
    expect(canManageApprovals('user')).toBe(false);
    expect(canManageApprovals(undefined)).toBe(false);
  });
});

describe('canManageStaffUsers', () => {
  it('allows admin, manager, owner, and HR to send intake links', () => {
    expect(canManageStaffUsers('admin')).toBe(true);
    expect(canManageStaffUsers('manager')).toBe(true);
    expect(canManageStaffUsers('owner')).toBe(true);
    expect(canManageStaffUsers('hr')).toBe(true);
    expect(canManageStaffUsers('HR')).toBe(true);
  });

  it('blocks standard users', () => {
    expect(canManageStaffUsers('user')).toBe(false);
    expect(canManageStaffUsers(undefined)).toBe(false);
  });
});
