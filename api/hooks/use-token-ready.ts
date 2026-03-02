'use client';

import { useState, useEffect } from 'react';
import { useAuth, useOrganization } from '@clerk/nextjs';

/**
 * Resolves the Clerk token once when the user is signed in so we can gate API
 * requests on "token ready" and avoid firing requests before the token is available.
 * Returns isTokenReady (true after getToken() resolved with a non-null token) and
 * isTokenLoading (derived: true whenever signed in and token not yet ready, including first render).
 */
export function useTokenReady() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { organization } = useOrganization();
  const [isTokenReady, setIsTokenReady] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setIsTokenReady(false);
      return;
    }

    let cancelled = false;

    getToken({ organizationId: organization?.id ?? undefined })
      .then((token) => {
        if (!cancelled) {
          setIsTokenReady(!!token);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsTokenReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, organization?.id, getToken]);

  const isTokenLoading = isSignedIn && !isTokenReady;
  return { isTokenReady, isTokenLoading };
}
