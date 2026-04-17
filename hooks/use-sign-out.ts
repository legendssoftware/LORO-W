'use client';

import { useClerk } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { getSessionSyncQueryKey } from '@/api/hooks';
import {
  LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY,
  LORO_SALES_BENCHMARKS_WELCOME_DISMISSED_KEY,
  LORO_WELCOME_SHOWN_SESSION_KEY,
} from '@/lib/client-session-keys';
import { useSessionStore } from '@/store/session-store';

const SIGN_IN_PATH = '/sign-in';

/**
 * Shared sign-out: clears client caches, ends session store, Clerk sign-out, then a full
 * document load to sign-in (same effect as Ctrl+R for the next user on a shared PC).
 * Use in AppHeader and InactivityGuard so behavior stays identical.
 */
export function useSignOut() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  async function performSignOut() {
    queryClient.removeQueries({ queryKey: getSessionSyncQueryKey() });
    useSessionStore.getState().endSession();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(LORO_WELCOME_SHOWN_SESSION_KEY);
        sessionStorage.removeItem(LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY);
        localStorage.removeItem(LORO_SALES_BENCHMARKS_WELCOME_DISMISSED_KEY);
      } catch {
        /* ignore private mode / quota */
      }
    }
    await Promise.resolve(signOut());
    if (typeof window !== 'undefined') {
      window.location.assign(SIGN_IN_PATH);
    }
  }

  return { performSignOut };
}
