'use client';

import { useClerk } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { getSessionSyncQueryKey } from '@/api/hooks';
import { useSessionStore } from '@/store/session-store';

/**
 * Shared sign-out: clears session sync query, ends session store, then Clerk sign-out.
 * Use in AppHeader and InactivityGuard so behavior stays identical.
 */
export function useSignOut() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  function performSignOut() {
    queryClient.removeQueries({ queryKey: getSessionSyncQueryKey() });
    useSessionStore.getState().endSession();
    // Redirect to landing page (/) so user never lands on app routes like /visits
    signOut({ redirectUrl: '/' });
  }

  return { performSignOut };
}
