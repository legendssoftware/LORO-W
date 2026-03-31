'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { getAttStatus, getAttMetrics } from '@/api/endpoints/attendance';
import type { AttStatusResponse, AttendanceMetrics } from '@/api/types';

function normalizeAttStatus(data: AttStatusResponse): AttStatusResponse {
  return {
    ...data,
    nextAction:
      data?.nextAction ?? (data?.checkedIn ? 'End Shift' : 'Start Shift'),
    checkedIn: data?.checkedIn === true,
  };
}

/**
 * Hover/intent prefetch for dashboard attendance queries (matches useAttStatus / useAttMetrics keys and transforms).
 */
export function usePrefetchDashboardQueries() {
  const queryClient = useQueryClient();
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();

  return useCallback(() => {
    if (!isTokenReady) return;

    void queryClient.prefetchQuery({
      queryKey: ['att-status'],
      queryFn: async () => {
        const data = await getAttStatus(client);
        return normalizeAttStatus(data);
      },
      staleTime: 30 * 1000,
    });

    void queryClient.prefetchQuery({
      queryKey: ['att', 'metrics'],
      queryFn: async () => {
        const response = await getAttMetrics(client);
        return response.metrics as AttendanceMetrics;
      },
      staleTime: 60 * 1000,
    });
  }, [queryClient, client, isTokenReady]);
}
