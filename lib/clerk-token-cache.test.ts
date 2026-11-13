import { describe, expect, it } from 'vitest';
import { clearClerkTokenCache, getCachedClerkToken, seedClerkTokenCache } from './clerk-token-cache';

function jwtExpiringIn(seconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + seconds;
  const payload = btoa(JSON.stringify({ exp }));
  return `hdr.${payload}.sig`;
}

describe('clerk token cache', () => {
  it('reuses a token that still has more than the refresh window left', () => {
    clearClerkTokenCache();
    const token = jwtExpiringIn(50);
    seedClerkTokenCache(token, 'org');
    expect(getCachedClerkToken('org')).toBe(token);
    clearClerkTokenCache();
  });

  it('drops a token inside the refresh window so the next call mints a new one', () => {
    clearClerkTokenCache();
    seedClerkTokenCache(jwtExpiringIn(10), 'org');
    expect(getCachedClerkToken('org')).toBeNull();
    clearClerkTokenCache();
  });
});
