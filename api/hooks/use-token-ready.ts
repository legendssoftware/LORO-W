'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useOrgId, useActiveClerkOrganizationId } from '@/lib/org-id-context';
import { getClerkTokenParams, isClerkOrganizationId } from '@/lib/clerk-session-token';
import { debugApi, isApiDebugEnabled } from '@/lib/api-debug';

/**
 * Resolves the Clerk token once when the user is signed in so we can gate API
 * requests on "token ready" and avoid firing requests before the token is available.
 * Returns isTokenReady (true after getToken() resolved with a non-null token) and
 * isTokenLoading (derived: true whenever signed in and token not yet ready, including first render).
 */
export function useTokenReady() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const orgId = useOrgId();
  const activeClerkOrganizationId = useActiveClerkOrganizationId();
  const [isTokenReady, setIsTokenReady] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      if (isApiDebugEnabled()) {
        debugApi('useTokenReady', { isLoaded, isSignedIn, reset: true });
      }
      setIsTokenReady(false);
      return;
    }

    let cancelled = false;
    const tokenParams = getClerkTokenParams(orgId, activeClerkOrganizationId);
    if (isApiDebugEnabled()) {
      debugApi('useTokenReady getToken', {
        orgId,
        activeClerkOrganizationId,
        passesClerkOrganizationId: isClerkOrganizationId(orgId),
        hasOrganizationIdParam: 'organizationId' in tokenParams,
      });
    }

    getToken(tokenParams)
      .then((token) => {
        if (!cancelled) {
          setIsTokenReady(!!token);
        }
        if (isApiDebugEnabled()) {
          debugApi('useTokenReady result', {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIsTokenReady(false);
        }
        if (isApiDebugEnabled()) {
          debugApi('useTokenReady getToken rejected', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, orgId, activeClerkOrganizationId, getToken]);

  const isTokenLoading = isSignedIn && !isTokenReady;
  return { isTokenReady, isTokenLoading };
}
