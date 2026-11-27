import { describe, expect, it } from 'vitest';
import {
  canClockInOffsite,
  isDesktopBrowser,
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

describe('isDesktopBrowser', () => {
  it('treats desktop-class browsers as desktop', () => {
    expect(
      isDesktopBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'),
    ).toBe(true);
    expect(isDesktopBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15')).toBe(true);
  });

  it('treats phones and tablets as non-desktop', () => {
    expect(isDesktopBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isDesktopBrowser('Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isDesktopBrowser('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/124.0 Mobile Safari/537.36')).toBe(false);
  });

  it('is false when the user agent is missing', () => {
    expect(isDesktopBrowser(undefined)).toBe(false);
  });
});
