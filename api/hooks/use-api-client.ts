'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useOrgId } from '@/lib/org-id-context';
import { getClerkTokenParams } from '@/lib/clerk-session-token';
import { createApiClient } from '@/api/client';

/**
 * Returns an Axios instance that injects the current Clerk token on each request.
 * Token uses Clerk `organizationId` only when `orgId` is a real Clerk org (`org_…`);
 * app-owned tenant ids (`loro_org_…`) omit it so Clerk still mints a session token.
 */
export function useApiClient() {
  const { getToken } = useAuth();
  const orgId = useOrgId();

  const getTokenWithOrg = useCallback(async () => {
    return getToken(getClerkTokenParams(orgId));
  }, [getToken, orgId]);

  return useMemo(() => createApiClient(getTokenWithOrg), [getTokenWithOrg]);
}
