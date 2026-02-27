'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/nextjs';
import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { syncClerk } from '@/api/endpoints/auth';
import type { SyncResult, SyncProfile } from '@/api/types';
import { useSessionStore } from '@/store/session-store';

function getProfileFromSyncData(data: unknown): SyncProfile | null {
  if (data && typeof data === 'object' && 'profileData' in data) {
    const profile = (data as SyncResult).profileData;
    return profile ?? null;
  }
  return null;
}

const SESSION_SYNC_QUERY_KEY = ['session-profile-sync'] as const;

/**
 * Syncs Clerk session with backend user data (org, profile, access level).
 * Single source of truth: one sync per session, result cached and optionally stored in session store.
 * Profile display (name, email, photo) comes from Clerk's useUser(); this hook provides backend data (uid, accessLevel, branch, etc.).
 * Triggers force-sync when Clerk user profile changes (e.g. after editing in Clerk profile modal).
 */
export function useSessionSync() {
  const client = useApiClient();
  const { isSignedIn, isLoaded: isClerkLoaded, getToken, sessionId } = useAuth();
  const { user: clerkUser } = useUser();
  const { isTokenReady } = useTokenReady();
  const queryClient = useQueryClient();
  const updateSessionMetadata = useSessionStore((s) => s.updateSessionMetadata);
  const startSession = useSessionStore((s) => s.startSession);

  const queryKey = useMemo(
    () => [...SESSION_SYNC_QUERY_KEY, isSignedIn, sessionId ?? ''],
    [isSignedIn, sessionId]
  );

  const existingBackendData = useMemo(
    () => queryClient.getQueryData(queryKey),
    [queryClient, queryKey]
  );

  const shouldSync = Boolean(
    isClerkLoaded && isSignedIn && !existingBackendData
  );

  const { data, isLoading, error } = useQuery({
    queryKey,
    enabled: shouldSync && isTokenReady,
    queryFn: async (): Promise<SyncResult> => {
      const token = await getToken();
      if (!token) throw new Error('No token available');
      return syncClerk(client, token);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const forceSyncMutation = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const token = await getToken();
      if (!token) throw new Error('No token available');
      return syncClerk(client, token, { forceSync: true });
    },
    onSuccess: (syncData) => {
      const profile = getProfileFromSyncData(syncData);
      if (profile) {
        startSession({ profileData: profile });
      }
      queryClient.setQueryData(queryKey, syncData);
    },
  });

  const refetchWithForceSync = useCallback(() => {
    if (isSignedIn && isTokenReady) {
      forceSyncMutation.mutate();
    }
  }, [isSignedIn, isTokenReady, forceSyncMutation]);

  const lastClerkUserId = useRef<string | null>(null);
  const lastSessionId = useRef<string | null>(null);
  const prevClerkProfileRef = useRef<string | null>(null);

  useEffect(() => {
    if (isClerkLoaded && isSignedIn && clerkUser?.id && sessionId) {
      if (
        lastClerkUserId.current !== clerkUser.id ||
        lastSessionId.current !== sessionId
      ) {
        lastClerkUserId.current = clerkUser.id;
        lastSessionId.current = sessionId;
        updateSessionMetadata({
          clerkUserId: clerkUser.id,
          clerkSessionId: sessionId,
        });
      }
    }
  }, [
    isClerkLoaded,
    isSignedIn,
    clerkUser?.id,
    sessionId,
    updateSessionMetadata,
  ]);

  useEffect(() => {
    const profile = data ? getProfileFromSyncData(data) : null;
    if (profile) {
      startSession({ profileData: profile });
    }
  }, [data, startSession]);

  useEffect(() => {
    if (!clerkUser || !data) return;
    const profileKey = `${clerkUser.imageUrl ?? ''}|${clerkUser.firstName ?? ''}|${clerkUser.primaryEmailAddress?.emailAddress ?? ''}`;
    if (prevClerkProfileRef.current !== null && prevClerkProfileRef.current !== profileKey) {
      refetchWithForceSync();
    }
    prevClerkProfileRef.current = profileKey;
  }, [
    clerkUser?.imageUrl,
    clerkUser?.firstName,
    clerkUser?.primaryEmailAddress?.emailAddress,
    data,
    refetchWithForceSync,
  ]);

  const backendUserData = useMemo(
    () => (data ? getProfileFromSyncData(data) : null),
    [data]
  );

  return {
    isSyncing: isLoading || forceSyncMutation.isPending,
    error: error ?? forceSyncMutation.error,
    backendUserData,
    refetchWithForceSync,
  };
}

/** Query key base for invalidation on sign-out */
export function getSessionSyncQueryKey() {
  return SESSION_SYNC_QUERY_KEY;
}
