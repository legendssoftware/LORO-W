import { describe, expect, it } from 'vitest';
import { clerkBrowserOrigins, contentSecurityPolicy } from '@/lib/content-security-policy';

describe('contentSecurityPolicy', () => {
  it('allows the production Clerk Frontend API and Account Portal', () => {
    const policy = contentSecurityPolicy({
      apiUrl: 'https://api.loro.co.za',
      clerkPublishableKey: `pk_live_${Buffer.from('clerk.loro.co.za$').toString('base64')}`,
    });

    expect(policy).toContain('https://clerk.loro.co.za');
    expect(policy).toContain('https://accounts.loro.co.za');
    expect(policy).toContain('wss://clerk.loro.co.za');
    expect(policy).toContain("connect-src 'self' blob: https://api.loro.co.za");
    expect(clerkBrowserOrigins(undefined)).toEqual([
      'https://clerk.loro.co.za',
      'https://accounts.loro.co.za',
    ]);
  });
});
