'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useSessionSync } from '@/api/hooks';
import { canAccess } from '@/lib/access';
import { getDefaultRoute } from '@/lib/user-mode';

/**
 * Client-side route guard: redirects to /dashboard when the current path
 * is not allowed for the user's access level. Children always render (data
 * requests use Clerk token and run immediately). Redirect runs only after
 * backend profile sync completes so we know access level.
 */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { backendUserData, isSyncing } = useSessionSync();

  useEffect(() => {
    if (!isSignedIn) return;
    if (isSyncing) return; // Wait for sync to know access level before redirect
    const accessLevel = backendUserData?.accessLevel;
    const allowed = canAccess(pathname ?? '', accessLevel, backendUserData?.approvableTypes);
    if (!allowed) {
      router.replace(getDefaultRoute(backendUserData ?? undefined));
    }
  }, [isSignedIn, pathname, router, isSyncing, backendUserData?.accessLevel, backendUserData?.approvableTypes]);

  return <>{children}</>;
}
