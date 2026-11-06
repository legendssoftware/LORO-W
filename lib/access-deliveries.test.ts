import { describe, expect, it } from 'vitest';
import {
  canAccess,
  canDispatchDeliveries,
  canViewOrganisationDeliveries,
  getAllowedRoutes,
  STANDARD_USER_PATHS,
} from './access';

describe('canDispatchDeliveries', () => {
  it('allows admin, manager, and owner', () => {
    expect(canDispatchDeliveries('admin')).toBe(true);
    expect(canDispatchDeliveries('manager')).toBe(true);
    expect(canDispatchDeliveries('owner')).toBe(true);
  });

  it('is case and whitespace insensitive', () => {
    expect(canDispatchDeliveries('Admin')).toBe(true);
    expect(canDispatchDeliveries(' OWNER ')).toBe(true);
  });

  it('blocks HR, which may still open the page but must not dispatch', () => {
    expect(canDispatchDeliveries('hr')).toBe(false);
  });

  it('blocks standard users and missing levels', () => {
    expect(canDispatchDeliveries('user')).toBe(false);
    expect(canDispatchDeliveries('client')).toBe(false);
    expect(canDispatchDeliveries(undefined)).toBe(false);
    expect(canDispatchDeliveries('')).toBe(false);
  });

  it('lets a management workforce type dispatch even when the access level is user', () => {
    expect(canDispatchDeliveries({ accessLevel: 'user', workforceType: 'management' })).toBe(true);
    expect(canDispatchDeliveries({ accessLevel: 'hr', workforceType: 'field_employee' })).toBe(false);
  });
});

describe('canViewOrganisationDeliveries', () => {
  it('shows the organisation list to admin, manager, and owner', () => {
    expect(canViewOrganisationDeliveries({ accessLevel: 'admin', workforceType: 'field_employee' })).toBe(true);
    expect(canViewOrganisationDeliveries({ accessLevel: 'manager' })).toBe(true);
    expect(canViewOrganisationDeliveries({ accessLevel: 'owner' })).toBe(true);
  });

  it('reads workforce type so management sees the organisation list without a manager access level', () => {
    expect(canViewOrganisationDeliveries({ accessLevel: 'user', workforceType: 'management' })).toBe(true);
    expect(canViewOrganisationDeliveries({ accessLevel: 'hr', workforceType: ' Management ' })).toBe(true);
  });

  it('keeps other staff on their own stops', () => {
    expect(canViewOrganisationDeliveries({ accessLevel: 'user', workforceType: 'driver' })).toBe(false);
    expect(canViewOrganisationDeliveries({ accessLevel: 'user', workforceType: 'field_employee' })).toBe(false);
    expect(canViewOrganisationDeliveries(undefined)).toBe(false);
  });
});

describe('/deliveries access', () => {
  it('is listed as a standard user path', () => {
    expect(STANDARD_USER_PATHS).toContain('/deliveries');
  });

  it('lets a restricted staff user open the page and a stop', () => {
    expect(canAccess('/deliveries', 'user')).toBe(true);
    expect(canAccess('/deliveries/10482', 'user')).toBe(true);
  });

  it('lets a dispatcher open the page', () => {
    expect(canAccess('/deliveries', 'admin')).toBe(true);
    expect(canAccess('/deliveries/10482', 'manager')).toBe(true);
  });

  it('keeps client portal users off the page', () => {
    expect(canAccess('/deliveries', 'client')).toBe(false);
    expect(canAccess('/deliveries/10482', 'client')).toBe(false);
  });
});

describe('deliveries navigation', () => {
  it('appears in the nav for a dispatcher', () => {
    const paths = getAllowedRoutes('admin').map((route) => route.path);
    expect(paths).toContain('/deliveries');
  });

  it('appears in the nav for a restricted staff user', () => {
    const paths = getAllowedRoutes('user').map((route) => route.path);
    expect(paths).toContain('/deliveries');
  });

  it('is hidden from client portal users', () => {
    const paths = getAllowedRoutes('client').map((route) => route.path);
    expect(paths).not.toContain('/deliveries');
  });
});

describe('canAccess with a missing level', () => {
  it('allows public paths', () => {
    expect(canAccess('/sign-in', undefined)).toBe(true);
    expect(canAccess('/', '')).toBe(true);
  });

  it('denies app paths until a role is known', () => {
    expect(canAccess('/staff', undefined)).toBe(false);
    expect(canAccess('/payslips', undefined)).toBe(false);
    expect(canAccess('/clients', '')).toBe(false);
    expect(canAccess('/dashboard', undefined)).toBe(false);
    expect(getAllowedRoutes(undefined)).toEqual([]);
    expect(getAllowedRoutes('')).toEqual([]);
  });

  it('still allows admins and owners onto those paths', () => {
    expect(canAccess('/staff', 'admin')).toBe(true);
    expect(canAccess('/payslips', 'owner')).toBe(true);
    expect(canAccess('/clients', 'manager')).toBe(true);
  });
});
