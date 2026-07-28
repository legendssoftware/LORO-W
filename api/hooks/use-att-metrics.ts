'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getAttMetrics } from '@/api/endpoints/attendance';
import type { AttendanceMetrics } from '@/api/types';

const QUERY_KEY = ['att', 'metrics'] as const;

/**
 * Fetches attendance metrics (total hours, streak) for the current user.
 * Enable only when not a client and profile is loaded.
 * `scope: 'full'` includes timing / productivity insights (reports Attendance).
 */
export function useAttMetrics(options?: {
  enabled?: boolean;
  scope?: 'full' | 'dashboard';
}) {
  const client = useApiClient();
  const scope = options?.scope ?? 'dashboard';
  return useQuery({
    queryKey: [...QUERY_KEY, scope] as const,
    queryFn: async () => {
      const response = await getAttMetrics(client, { scope });
      return response.metrics as AttendanceMetrics;
    },
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
