import { describe, expect, it } from 'vitest';
import { nextTokenWatchDelayMs } from './clerk-token-watch';

describe('nextTokenWatchDelayMs', () => {
  it('backs off and then caps the wait', () => {
    expect(nextTokenWatchDelayMs(1)).toBe(1_000);
    expect(nextTokenWatchDelayMs(2)).toBe(2_000);
    expect(nextTokenWatchDelayMs(3)).toBe(4_000);
    expect(nextTokenWatchDelayMs(6)).toBe(8_000);
  });
});
