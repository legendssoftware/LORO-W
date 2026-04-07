'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useOrgId, useActiveClerkOrganizationId } from '@/lib/org-id-context';
import { getClerkTokenParams } from '@/lib/clerk-session-token';
import { createApiClient } from '@/api/client';

/**
 * Returns an Axios instance that injects the current Clerk token on each request.
 * Token uses Clerk `organizationId` only when context `orgId` is the active Clerk org;
 * app-owned tenant ids (`loro_org_…`) omit it so Clerk still mints a session token.
 */
export function useApiClient() {
  const { getToken } = useAuth();
  const orgId = useOrgId();
  const activeClerkOrganizationId = useActiveClerkOrganizationId();

  const getTokenWithOrg = useCallback(async () => {
    return getToken(getClerkTokenParams(orgId, activeClerkOrganizationId));
  }, [getToken, orgId, activeClerkOrganizationId]);

  return useMemo(() => createApiClient(getTokenWithOrg), [getTokenWithOrg]);
}
