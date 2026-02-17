'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { syncClerk } from '@/api/endpoints/auth';
import type { SyncResult } from '@/api/types';

const QUERY_KEY = ['sync-clerk'] as const;

/**
 * Fetches and caches the sync-clerk result (profile data) for the current user.
 * Gated on token ready to avoid canceled requests; enable only when signed in.
 */
export function useSyncClerk(options?: { enabled?: boolean }) {
  const client = useApiClient();
  const { getToken } = useAuth();
  const { isTokenReady } = useTokenReady();
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<SyncResult> => {
      const token = await getToken();
      if (!token) return { profileData: undefined };
      return syncClerk(client, token);
    },
    enabled: (options?.enabled !== false) && isTokenReady,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
