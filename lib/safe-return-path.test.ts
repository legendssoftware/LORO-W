import { describe, expect, it } from 'vitest';
import { safeReturnPath, signInHref, signedInAuthDestination } from '@/lib/safe-return-path';

describe('signedInAuthDestination', () => {
  const requestUrl = 'https://app.loro.co.za/sign-in';

  it('restores a same-origin return path instead of the dashboard', () => {
    expect(signedInAuthDestination('/leads?status=open', requestUrl)).toBe('/leads?status=open');
    expect(signedInAuthDestination(encodeURIComponent('/merchandise/12'), requestUrl)).toBe(
      '/merchandise/12',
    );
  });

  it('rejects open redirects and falls back to the dashboard', () => {
    expect(signedInAuthDestination('https://evil.example/phish', requestUrl)).toBe('/dashboard');
    expect(signedInAuthDestination('//evil.example', requestUrl)).toBe('/dashboard');
    expect(signedInAuthDestination(null, requestUrl)).toBe('/dashboard');
  });
});

describe('signInHref', () => {
  it('keeps the refreshed page on the sign-in redirect', () => {
    expect(signInHref('/reports')).toBe('/sign-in?redirect_url=%2Freports');
  });

  it('does not use the site root as a return path', () => {
    expect(safeReturnPath('/')).toBe('/');
    expect(signInHref('https://evil.example')).toBe('/sign-in?redirect_url=%2Fdashboard');
  });
});
