'use client';

import { useClerk } from '@clerk/nextjs';
import { clearClerkTokenCache } from '@/lib/clerk-token-cache';
import { useQueryClient } from '@tanstack/react-query';
import { getSessionSyncQueryKey } from '@/api/hooks';
import {
  LORO_ORG_NOTICE_COUNTED_SESSION_ID_KEY,
  LORO_ORG_NOTICE_COUNTED_UID_KEY,
  LORO_ORG_NOTICE_DISMISSED_UID_KEY,
  LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY,
  LORO_SALES_BENCHMARKS_WELCOME_DISMISSED_KEY,
  LORO_WELCOME_SHOWN_SESSION_KEY,
} from '@/lib/client-session-keys';
import { useSessionStore } from '@/store/session-store';

const SIGN_IN_PATH = '/sign-in';
/** Clerk sign-out can hang when the network is still down after wake. */
const SIGN_OUT_TIMEOUT_MS = 4_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clearSignedInClientState(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(LORO_WELCOME_SHOWN_SESSION_KEY);
    sessionStorage.removeItem(LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY);
    sessionStorage.removeItem(LORO_ORG_NOTICE_DISMISSED_UID_KEY);
    sessionStorage.removeItem(LORO_ORG_NOTICE_COUNTED_SESSION_ID_KEY);
    sessionStorage.removeItem(LORO_ORG_NOTICE_COUNTED_UID_KEY);
    localStorage.removeItem(LORO_SALES_BENCHMARKS_WELCOME_DISMISSED_KEY);
  } catch {
    /* ignore private mode / quota */
  }
}

/**
 * Shared sign-out: asks Clerk to end the session, then clears client caches and
 * loads sign-in. The profile stays in memory until navigation so a slow Clerk
 * call cannot flash the profile-load error.
 * Use in AppHeader and InactivityGuard so behavior stays identical.
 */
export function useSignOut() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  async function performSignOut() {
    try {
      await Promise.race([
        Promise.resolve(signOut()).then(() => undefined),
        delay(SIGN_OUT_TIMEOUT_MS),
      ]);
    } catch {
      // Navigation still proceeds when Clerk sign-out rejects.
    }
    clearClerkTokenCache();
    queryClient.removeQueries({ queryKey: getSessionSyncQueryKey() });
    useSessionStore.getState().endSession();
    clearSignedInClientState();
    if (typeof window !== 'undefined') {
      window.location.assign(SIGN_IN_PATH);
    }
  }

  return { performSignOut };
}
