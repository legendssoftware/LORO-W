'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useSyncClerk } from '@/api/hooks';
import { canAccess } from '@/lib/access';

/**
 * Client-side route guard: redirects to /dashboard when the current path
 * is not allowed for the user's access level. Only runs when signed in
 * and after profile is loaded.
 */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const syncQuery = useSyncClerk({ enabled: isSignedIn ?? false });

  useEffect(() => {
    if (!isSignedIn || syncQuery.isLoading) return;
    const profile = syncQuery.data?.profileData;
    const accessLevel = profile?.accessLevel;
    const allowed = canAccess(pathname ?? '', accessLevel);
    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [isSignedIn, pathname, router, syncQuery.isLoading, syncQuery.data?.profileData?.accessLevel]);

  return <>{children}</>;
}
