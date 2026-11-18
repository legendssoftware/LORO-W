import { describe, expect, it } from 'vitest';
import { canAccess } from '@/lib/access';

describe('web API gap routes', () => {
  it('keeps a standard user off admin-only routes', () => {
    expect(canAccess('/warnings', 'user')).toBe(false);
    expect(canAccess('/feedback', 'user')).toBe(false);
    expect(canAccess('/products', 'user')).toBe(false);
    expect(canAccess('/loyalty', 'user')).toBe(false);
    expect(canAccess('/usage', 'user')).toBe(false);
    expect(canAccess('/sales-tips', 'user')).toBe(false);
    expect(canAccess('/resellers', 'user')).toBe(false);
  });

  it('lets a standard user open their own leave, documents, news, rewards, and geofences', () => {
    expect(canAccess('/leave', 'user')).toBe(true);
    expect(canAccess('/documents', 'user')).toBe(true);
    expect(canAccess('/news', 'user')).toBe(true);
    expect(canAccess('/rewards', 'user')).toBe(true);
    expect(canAccess('/geofences', 'user')).toBe(true);
  });

  it('matches controller roles for elevated and restricted staff', () => {
    expect(canAccess('/warnings', 'support')).toBe(true);
    expect(canAccess('/warnings', 'hr')).toBe(false);
    expect(canAccess('/usage', 'developer')).toBe(true);
    expect(canAccess('/usage', 'user')).toBe(false);
    expect(canAccess('/products', 'admin')).toBe(true);
    expect(canAccess('/loyalty', 'manager')).toBe(true);
    expect(canAccess('/feedback', 'owner')).toBe(true);
    expect(canAccess('/leave', 'hr')).toBe(false);
  });
});
