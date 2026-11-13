import { describe, expect, it } from 'vitest';
import { isIdleExpired } from './inactivity';

describe('isIdleExpired', () => {
  it('is false until the idle window has elapsed', () => {
    expect(isIdleExpired(1_000, 1_000 + 9 * 60_000, 10 * 60_000)).toBe(false);
    expect(isIdleExpired(1_000, 1_000 + 10 * 60_000, 10 * 60_000)).toBe(true);
  });

  it('stays false when the idle timeout is disabled', () => {
    expect(isIdleExpired(0, 60_000, 0)).toBe(false);
  });
});
