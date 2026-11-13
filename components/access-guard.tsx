'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useSessionSync } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { canAccess, PUBLIC_OR_AUTH_PATHS } from '@/lib/access';
import { shouldEndSessionAfterClerkSyncFailure } from '@/lib/api/query-error';
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
 * A failed sync stays on this screen with a retry. It does not send the user
 * to another gated route.
 */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { backendUserData, isSyncing, isProfileFetchPending, error, retrySessionSync } =
    useSessionSync();

  const publicPath = isPublicPath(pathname);
  const profileReady = Boolean(backendUserData);
  const endingSession = Boolean(error && shouldEndSessionAfterClerkSyncFailure(error));
  const waitingForProfile =
    Boolean(isSignedIn) && !publicPath && !profileReady && !error && !endingSession;
  const syncFailed =
    Boolean(isSignedIn) &&
    !publicPath &&
    !profileReady &&
    Boolean(error) &&
    !isSyncing &&
    !isProfileFetchPending &&
    !endingSession;
  const allowed = profileReady
    ? canAccess(
        pathname,
        backendUserData?.accessLevel,
        backendUserData?.approvableTypes,
        backendUserData,
      )
    : false;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || publicPath || !profileReady || allowed) return;
    router.replace(getDefaultRoute(backendUserData ?? undefined));
  }, [allowed, backendUserData, isLoaded, isSignedIn, pathname, profileReady, publicPath, router]);

  if (!isLoaded && !publicPath) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isSignedIn || publicPath) return <>{children}</>;

  if (
    endingSession ||
    waitingForProfile ||
    (isSyncing && !profileReady) ||
    isProfileFetchPending
  ) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (syncFailed) {
    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
        <p>Could not load your profile.</p>
        <Button type="button" variant="outline" onClick={retrySessionSync}>
          Try again
        </Button>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
