'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
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

const PREFETCH_COOLDOWN_MS = 2000;

/**
 * Hover/intent prefetch for dashboard attendance queries (matches useAttStatus / useAttMetrics keys and transforms).
 */
export function usePrefetchDashboardQueries() {
  const queryClient = useQueryClient();
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const lastPrefetchAtRef = useRef(0);

  return useCallback(() => {
    if (!isTokenReady) return;
    const now = Date.now();
    if (now - lastPrefetchAtRef.current < PREFETCH_COOLDOWN_MS) return;
    lastPrefetchAtRef.current = now;

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
        const response = await getAttMetrics(client, { scope: 'dashboard' });
        return response.metrics as AttendanceMetrics;
      },
      staleTime: 60 * 1000,
    });
  }, [queryClient, client, isTokenReady]);
}
