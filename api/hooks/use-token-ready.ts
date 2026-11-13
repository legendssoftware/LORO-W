'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useOrgId, useActiveClerkOrganizationId } from '@/lib/org-id-context';
import { getClerkTokenParams, isClerkOrganizationId } from '@/lib/clerk-session-token';
import { clerkTokenCacheKey } from '@/lib/clerk-token-cache';
import {
  resetClerkTokenWatch,
  retryClerkTokenWatch,
  watchClerkToken,
  type ClerkTokenWatchState,
} from '@/lib/clerk-token-watch';
import { debugApi, isApiDebugEnabled } from '@/lib/api-debug';

/**
 * Gates API calls on a Clerk session token.
 * Retries while signed in, including after the tab wakes, and keeps `isTokenReady`
 * true once a token has been minted so a later refresh failure does not blank the app.
 */
export function useTokenReady() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const orgId = useOrgId();
  const activeClerkOrganizationId = useActiveClerkOrganizationId();
  const [isTokenReady, setIsTokenReady] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<Error | null>(null);
  const cacheKey = clerkTokenCacheKey(orgId, activeClerkOrganizationId);
  const getTokenRef = useRef(getToken);

  const applyState = useCallback((state: ClerkTokenWatchState) => {
    setIsTokenReady(state.ready);
    setSessionToken(state.token);
    setTokenError(state.error);
    if (!isApiDebugEnabled()) return;
    debugApi('useTokenReady result', {
      hasToken: Boolean(state.token),
      ready: state.ready,
      error: state.error?.message ?? null,
    });
  }, []);

  useEffect(() => {
    getTokenRef.current = getToken;
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      if (isApiDebugEnabled()) {
        debugApi('useTokenReady', { isLoaded, isSignedIn, reset: true });
      }
      resetClerkTokenWatch();
      return;
    }

    const tokenParams = getClerkTokenParams(orgId, activeClerkOrganizationId);
    if (isApiDebugEnabled()) {
      debugApi('useTokenReady getToken', {
        orgId,
        activeClerkOrganizationId,
        passesClerkOrganizationId: isClerkOrganizationId(orgId),
        hasOrganizationIdParam: 'organizationId' in tokenParams,
      });
    }

    return watchClerkToken(
      cacheKey,
      (params) => getTokenRef.current(params),
      tokenParams,
      applyState,
    );
  }, [applyState, isLoaded, isSignedIn, orgId, activeClerkOrganizationId, cacheKey]);

  const retryToken = useCallback(() => {
    retryClerkTokenWatch();
  }, []);

  const signedOut = Boolean(isLoaded && !isSignedIn);
  const isTokenLoading = Boolean(isSignedIn) && !isTokenReady;
  return {
    isTokenReady: signedOut ? false : isTokenReady,
    isTokenLoading,
    sessionToken: signedOut ? null : sessionToken,
    tokenError: signedOut ? null : tokenError,
    retryToken,
  };
}
