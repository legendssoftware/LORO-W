import { describe, expect, it } from 'vitest';
import {
  canAccess,
  canAccessPerformanceTracker,
  canManageApprovals,
  canManageStaffUsers,
  getAllowedRoutes,
} from './access';

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
  it('allows admin, manager, owner, HR, and finance family', () => {
    expect(canManageApprovals('admin')).toBe(true);
    expect(canManageApprovals('manager')).toBe(true);
    expect(canManageApprovals('owner')).toBe(true);
    expect(canManageApprovals('hr')).toBe(true);
    expect(canManageApprovals('finance')).toBe(true);
    expect(canManageApprovals('supervisor')).toBe(true);
  });

  it('allows a standard user who has approvable types', () => {
    expect(canManageApprovals('user', ['leave_request'])).toBe(true);
  });

  it('blocks standard users without types', () => {
    expect(canManageApprovals('user')).toBe(false);
    expect(canManageApprovals(undefined)).toBe(false);
  });
});

describe('canAccessPerformanceTracker', () => {
  it('allows admin, owner, and manager by access level', () => {
    expect(canAccessPerformanceTracker({ accessLevel: 'admin' })).toBe(true);
    expect(canAccessPerformanceTracker({ accessLevel: 'owner' })).toBe(true);
    expect(canAccessPerformanceTracker({ accessLevel: 'manager' })).toBe(true);
  });

  it('allows management and finance workforce types', () => {
    expect(
      canAccessPerformanceTracker({
        accessLevel: 'user',
        workforceType: 'management',
      })
    ).toBe(true);
    expect(
      canAccessPerformanceTracker({
        accessLevel: 'user',
        workforceType: 'finance',
      })
    ).toBe(true);
  });

  it('allows users with managed branches', () => {
    expect(
      canAccessPerformanceTracker({
        accessLevel: 'user',
        managedBranches: [12],
      })
    ).toBe(true);
  });

  it('blocks standard users without workforce or branches', () => {
    expect(canAccessPerformanceTracker(null)).toBe(false);
    expect(canAccessPerformanceTracker({ accessLevel: 'user' })).toBe(false);
    expect(
      canAccessPerformanceTracker({
        accessLevel: 'user',
        workforceType: 'field_employee',
        managedBranches: [],
      })
    ).toBe(false);
  });

  it('gates /performance via canAccess and sidebar routes', () => {
    expect(canAccess('/performance', 'user')).toBe(false);
    expect(
      canAccess('/performance', 'user', null, {
        accessLevel: 'user',
        workforceType: 'finance',
      })
    ).toBe(true);
    expect(canAccess('/performance', 'admin')).toBe(true);

    const restrictedRoutes = getAllowedRoutes('user', null, {
      accessLevel: 'user',
      managedBranches: [3],
    });
    expect(restrictedRoutes.some((r) => r.path === '/performance')).toBe(true);

    const userOnly = getAllowedRoutes('user');
    expect(userOnly.some((r) => r.path === '/performance')).toBe(false);
  });
});
