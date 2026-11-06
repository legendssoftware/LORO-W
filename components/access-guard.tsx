'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useSessionSync } from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { canAccess, PUBLIC_OR_AUTH_PATHS } from '@/lib/access';
import { getDefaultRoute } from '@/lib/user-mode';

function isPublicPath(pathname: string): boolean {
  const pathNormalized = pathname.replace(/\/$/, '') || '/';
  return PUBLIC_OR_AUTH_PATHS.some(
    (path) => pathNormalized === path || pathNormalized.startsWith(`${path}/`),
  );
}

/**
 * Client-side route guard. Protected pages stay unmounted until the backend
 * profile is loaded, and a missing access level is denied by canAccess.
 */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { backendUserData, isSyncing, error } = useSessionSync();

  const publicPath = isPublicPath(pathname);
  const profileReady = Boolean(backendUserData);
  const waitingForProfile =
    Boolean(isSignedIn) && !publicPath && !profileReady && !error;
  const syncFailed =
    Boolean(isSignedIn) && !publicPath && !profileReady && Boolean(error) && !isSyncing;
  const allowed = profileReady
    ? canAccess(
        pathname,
        backendUserData?.accessLevel,
        backendUserData?.approvableTypes,
        backendUserData,
      )
    : false;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || publicPath) return;
    if (waitingForProfile || (isSyncing && !profileReady)) return;
    if (syncFailed) {
      const fallback = getDefaultRoute(undefined);
      if (pathname !== fallback) router.replace(fallback);
      return;
    }
    if (profileReady && !allowed) {
      router.replace(getDefaultRoute(backendUserData ?? undefined));
    }
  }, [
    allowed,
    backendUserData,
    isLoaded,
    isSignedIn,
    isSyncing,
    pathname,
    profileReady,
    publicPath,
    router,
    syncFailed,
    waitingForProfile,
  ]);

  if (!isLoaded && !publicPath) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isSignedIn || publicPath) return <>{children}</>;

  if (waitingForProfile || (isSyncing && !profileReady)) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (syncFailed || !allowed) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8 text-sm text-muted-foreground">
        {syncFailed ? 'Could not load your profile.' : null}
      </div>
    );
  }

  return <>{children}</>;
}
