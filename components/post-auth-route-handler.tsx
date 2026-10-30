'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useSessionSync } from '@/api/hooks';
import { canAccess } from '@/lib/access';
import { getDefaultRoute, isClientMode } from '@/lib/user-mode';

/**
 * After a new Clerk session, move client-portal users off a staff route they cannot open.
 * A refresh of an allowed page stays put. AccessGuard covers later navigation.
 */
export function PostAuthRouteHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, sessionId } = useAuth();
  const { backendUserData: profile, isSyncing } = useSessionSync();
  const handledSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !sessionId || isSyncing || !profile) return;
    if (handledSessionRef.current === sessionId) return;
    handledSessionRef.current = sessionId;

    if (!isClientMode(profile)) return;

    const allowed = canAccess(
      pathname ?? '',
      profile.accessLevel,
      profile.approvableTypes,
      profile,
    );
    if (allowed) return;

    router.replace(getDefaultRoute(profile));
  }, [isSignedIn, sessionId, isSyncing, profile, pathname, router]);

  return null;
}
