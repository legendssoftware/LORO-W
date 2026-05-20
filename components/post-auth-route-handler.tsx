'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useSessionSync } from '@/api/hooks';
import { getDefaultRoute, isClientMode } from '@/lib/user-mode';

/**
 * On new Clerk session, redirect client portal users to their default route (/store).
 * Does not run again when the user navigates to /dashboard via sidebar Home.
 */
export function PostAuthRouteHandler() {
  const router = useRouter();
  const { isSignedIn, sessionId } = useAuth();
  const { backendUserData: profile, isSyncing } = useSessionSync();
  const handledSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !sessionId || isSyncing) return;
    if (handledSessionRef.current === sessionId) return;
    handledSessionRef.current = sessionId;

    if (isClientMode(profile)) {
      const target = getDefaultRoute(profile);
      router.replace(target);
    }
  }, [isSignedIn, sessionId, isSyncing, profile, router]);

  return null;
}
