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

/**
 * Shared sign-out: clears client caches, ends session store, Clerk sign-out, then a full
 * document load to sign-in (same effect as Ctrl+R for the next user on a shared PC).
 * Use in AppHeader and InactivityGuard so behavior stays identical.
 */
export function useSignOut() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  async function performSignOut() {
    clearClerkTokenCache();
    queryClient.removeQueries({ queryKey: getSessionSyncQueryKey() });
    useSessionStore.getState().endSession();
    if (typeof window !== 'undefined') {
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
    // #region agent log
    fetch('http://127.0.0.1:7852/ingest/c5d038c6-84ee-4625-93ea-42139de8e50d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fb95d'},body:JSON.stringify({sessionId:'2fb95d',location:'use-sign-out.ts:performSignOut',message:'sign-out started',data:{hypothesisId:'B'},timestamp:Date.now(),hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
    // #endregion
    try {
      await Promise.resolve(signOut());
      // #region agent log
      fetch('http://127.0.0.1:7852/ingest/c5d038c6-84ee-4625-93ea-42139de8e50d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fb95d'},body:JSON.stringify({sessionId:'2fb95d',location:'use-sign-out.ts:performSignOut',message:'clerk signOut resolved',data:{hypothesisId:'B'},timestamp:Date.now(),hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7852/ingest/c5d038c6-84ee-4625-93ea-42139de8e50d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fb95d'},body:JSON.stringify({sessionId:'2fb95d',location:'use-sign-out.ts:performSignOut',message:'clerk signOut rejected',data:{hypothesisId:'B',error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
      // #endregion
    }
    if (typeof window !== 'undefined') {
      window.location.assign(SIGN_IN_PATH);
    }
  }

  return { performSignOut };
}
