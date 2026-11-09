'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useOrgId, useActiveClerkOrganizationId } from '@/lib/org-id-context';
import { getClerkTokenParams, isClerkOrganizationId } from '@/lib/clerk-session-token';
import {
  clerkTokenCacheKey,
  clearClerkTokenCache,
  seedClerkTokenCache,
} from '@/lib/clerk-token-cache';
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
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const cacheKey = clerkTokenCacheKey(orgId, activeClerkOrganizationId);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      if (isApiDebugEnabled()) {
        debugApi('useTokenReady', { isLoaded, isSignedIn, reset: true });
      }
      clearClerkTokenCache();
      setIsTokenReady(false);
      setSessionToken(null);
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
          if (token) {
            seedClerkTokenCache(token, cacheKey);
          }
          setIsTokenReady(!!token);
          setSessionToken(token);
          // #region agent log
          fetch('http://127.0.0.1:7852/ingest/c5d038c6-84ee-4625-93ea-42139de8e50d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fb95d'},body:JSON.stringify({sessionId:'2fb95d',location:'use-token-ready.ts:getToken',message:'token resolved',data:{hypothesisId:'C',hasToken:Boolean(token)},timestamp:Date.now(),hypothesisId:'C',runId:'post-fix'})}).catch(()=>{});
          // #endregion
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
          clearClerkTokenCache();
          setIsTokenReady(false);
          setSessionToken(null);
          // #region agent log
          fetch('http://127.0.0.1:7852/ingest/c5d038c6-84ee-4625-93ea-42139de8e50d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fb95d'},body:JSON.stringify({sessionId:'2fb95d',location:'use-token-ready.ts:getToken',message:'token rejected',data:{hypothesisId:'C',error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),hypothesisId:'C',runId:'post-fix'})}).catch(()=>{});
          // #endregion
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
  }, [isLoaded, isSignedIn, orgId, activeClerkOrganizationId, getToken, cacheKey]);

  const isTokenLoading = isSignedIn && !isTokenReady;
  return { isTokenReady, isTokenLoading, sessionToken };
}
