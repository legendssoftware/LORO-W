import { describe, expect, it } from 'vitest';
import {
  canClockInOffsite,
  isOffsiteBlockedContext,
  remoteOptionKeysFromContext,
} from './clock-in-options';

describe('isOffsiteBlockedContext', () => {
  it('is true only when the server flags the context as blocked', () => {
    expect(isOffsiteBlockedContext({ offsiteClockInBlocked: true })).toBe(true);
    expect(isOffsiteBlockedContext({ offsiteClockInBlocked: false })).toBe(false);
    expect(isOffsiteBlockedContext(null)).toBe(false);
  });
});

describe('remoteOptionKeysFromContext', () => {
  it('returns no options for a blocked context', () => {
    expect(
      remoteOptionKeysFromContext({ availableClockInOptions: [], offsiteClockInBlocked: true }),
    ).toEqual([]);
  });

  it('returns the server remote options for exempt users', () => {
    expect(
      remoteOptionKeysFromContext({ availableClockInOptions: ['work_from_home', 'offsite'] }),
    ).toEqual(['work_from_home', 'offsite']);
  });

  it('only offers the fallback list when allowed', () => {
    expect(remoteOptionKeysFromContext(null, true).length).toBeGreaterThan(0);
    expect(remoteOptionKeysFromContext(null, false)).toEqual([]);
  });
});

describe('canClockInOffsite', () => {
  it('allows management access levels and field workforce types', () => {
    expect(canClockInOffsite({ accessLevel: 'Manager' })).toBe(true);
    expect(canClockInOffsite({ accessLevel: 'member', workforceType: 'driver' })).toBe(true);
  });

  it('restricts everyone else', () => {
    expect(canClockInOffsite({ accessLevel: 'member', workforceType: 'internal_employee' })).toBe(false);
    expect(canClockInOffsite(null)).toBe(false);
  });
});
