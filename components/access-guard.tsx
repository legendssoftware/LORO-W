'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useSessionSync } from '@/api/hooks';
import { canAccess } from '@/lib/access';

/**
 * Client-side route guard: redirects to /dashboard when the current path
 * is not allowed for the user's access level. Only runs when signed in
 * and after backend profile sync is done.
 */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { backendUserData, isSyncing } = useSessionSync();

  useEffect(() => {
    if (!isSignedIn || isSyncing) return;
    const accessLevel = backendUserData?.accessLevel;
    const allowed = canAccess(pathname ?? '', accessLevel);
    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [isSignedIn, pathname, router, isSyncing, backendUserData?.accessLevel]);

  return <>{children}</>;
}
