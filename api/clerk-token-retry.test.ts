import { describe, expect, it } from 'vitest';
import { tokenRetryDelayMs, withTimeout } from './clerk-token-retry';

describe('tokenRetryDelayMs', () => {
  it('spaces retries so a wake-up has time to get a network', () => {
    expect(tokenRetryDelayMs(1)).toBe(500);
    expect(tokenRetryDelayMs(2)).toBe(1_000);
    expect(tokenRetryDelayMs(3)).toBe(2_000);
    expect(tokenRetryDelayMs(4)).toBe(2_000);
  });
});

describe('withTimeout', () => {
  it('returns the value when the promise settles first', async () => {
    await expect(withTimeout(Promise.resolve('tok'), 50)).resolves.toBe('tok');
  });

  it('rejects when the promise does not settle', async () => {
    await expect(withTimeout(new Promise<string>(() => undefined), 20)).rejects.toThrow(
      'Token request timed out',
    );
  });
});
