import { describe, expect, it } from 'vitest';
import {
  canAccess,
  canDispatchDeliveries,
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
