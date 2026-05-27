'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import {
  getDailyOverview,
  getMonthlyMetrics,
  getPayrollHoursAll,
} from '@/api/endpoints/attendance';
import { DAILY_OVERVIEW_QUERY_KEY_PREFIX } from '@/api/hooks/use-daily-overview';
import { getMonthlyMetricsQueryKey } from '@/api/hooks/use-monthly-metrics';
import { getPayrollHoursAllQueryKey } from '@/api/hooks/use-payroll-hours-all';

const PREFETCH_COOLDOWN_MS = 2000;

/**
 * Hover/intent prefetch for Staff page queries (daily overview, monthly metrics, payroll hours).
 */
export function usePrefetchStaffQueries() {
  const queryClient = useQueryClient();
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const lastPrefetchAtRef = useRef(0);

  return useCallback(() => {
    if (!isTokenReady) return;
    const now = Date.now();
    if (now - lastPrefetchAtRef.current < PREFETCH_COOLDOWN_MS) return;
    lastPrefetchAtRef.current = now;

    const today = new Date();
    const singleDateStr = format(today, 'yyyy-MM-dd');
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const dailyParams = { date: singleDateStr };
    void queryClient.prefetchQuery({
      queryKey: [...DAILY_OVERVIEW_QUERY_KEY_PREFIX, dailyParams],
      queryFn: () => getDailyOverview(client, dailyParams),
      staleTime: 30 * 1000,
    });

    const monthlyBody = { year, month, includeCheckIns: false as const };
    void queryClient.prefetchQuery({
      queryKey: getMonthlyMetricsQueryKey(monthlyBody),
      queryFn: () => getMonthlyMetrics(client, monthlyBody),
      staleTime: 2 * 60 * 1000,
    });

    void queryClient.prefetchQuery({
      queryKey: getPayrollHoursAllQueryKey({}),
      queryFn: () => getPayrollHoursAll(client, {}),
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient, client, isTokenReady]);
}
