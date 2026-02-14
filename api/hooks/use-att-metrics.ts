'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getAttMetrics } from '@/api/endpoints/attendance';
import type { AttendanceMetrics } from '@/api/types';

const QUERY_KEY = ['att', 'metrics'] as const;

/**
 * Fetches attendance metrics (total hours, streak) for the current user.
 * Enable only when not a client and profile is loaded.
 */
export function useAttMetrics(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await getAttMetrics(client);
      return response.metrics as AttendanceMetrics;
    },
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
