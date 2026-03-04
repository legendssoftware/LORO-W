'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useOrgId } from '@/lib/org-id-context';
import { createApiClient } from '@/api/client';

/**
 * Returns an Axios instance that injects the current Clerk token on each request.
 * Token is requested with active organization context so the backend receives org via
 * Bearer token only (no x-org-id or orgId in query/body). Use inside ClerkProvider and QueryClientProvider.
 */
export function useApiClient() {
  const { getToken } = useAuth();
  const orgId = useOrgId();

  const getTokenWithOrg = useCallback(async () => {
    return getToken({ organizationId: orgId ?? undefined });
  }, [getToken, orgId]);

  return useMemo(() => createApiClient(getTokenWithOrg), [getTokenWithOrg]);
}
