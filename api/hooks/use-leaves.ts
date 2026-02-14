'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getLeavesByUser } from '@/api/endpoints/leave';
import type { LeaveRecord } from '@/api/types/leave';

const QUERY_KEY = ['leave', 'user'] as const;

/**
 * Fetches leave history for a user (requires clerkUserId).
 * Leave module is enterprise-only; returns empty array on 403.
 */
export function useLeaves(clerkUserId: string | null | undefined, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY, clerkUserId ?? 'none'],
    queryFn: async () => {
      const res = await getLeavesByUser(client, clerkUserId!);
      return res.leaves as LeaveRecord[];
    },
    enabled: (options?.enabled !== false) && !!clerkUserId,
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error: { response?: { status?: number } }) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
}
